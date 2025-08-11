import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { EveWikiClient } from "./eve-wiki-client.js";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("EVE Wiki Client Wayback Machine Fallback", () => {
  let client: EveWikiClient;
  let mockAxiosInstance: any;
  let mockWaybackInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock axios instances
    mockAxiosInstance = {
      get: vi.fn(),
    };
    
    mockWaybackInstance = {
      get: vi.fn(),
    };
    
    // Mock axios.create to return different instances
    mockedAxios.create
      .mockReturnValueOnce(mockAxiosInstance) // First call for main client
      .mockReturnValueOnce(mockWaybackInstance); // Second call for wayback client
    
    client = new EveWikiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Wayback Machine Availability Check", () => {
    it("should check Wayback Machine availability successfully", async () => {
      const mockWaybackResponse = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Rifter"
            }
          }
        }
      };

      mockWaybackInstance.get.mockResolvedValue(mockWaybackResponse);

      // Access private method for testing
      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      const result = await checkWaybackAvailability("https://wiki.eveuniversity.org/wiki/Rifter");

      expect(result).toEqual({
        timestamp: "20230401120000",
        url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Rifter",
        available: true
      });
    });

    it("should return null when no archived version is available", async () => {
      const mockWaybackResponse = {
        data: {
          archived_snapshots: {}
        }
      };

      mockWaybackInstance.get.mockResolvedValue(mockWaybackResponse);

      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      const result = await checkWaybackAvailability("https://example.com/nonexistent");

      expect(result).toBeNull();
    });

    it("should handle Wayback Machine API errors gracefully", async () => {
      mockWaybackInstance.get.mockRejectedValue(new Error("Network error"));

      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      const result = await checkWaybackAvailability("https://example.com");

      expect(result).toBeNull();
    });
  });

  describe("Wayback Content Retrieval", () => {
    it("should retrieve content from Wayback Machine with timestamp", async () => {
      const mockContent = "<html><body><h1>Rifter</h1><p>The Rifter is a Minmatar frigate.</p></body></html>";
      mockWaybackInstance.get.mockResolvedValue({ data: mockContent });

      const getWaybackContent = (client as any).getWaybackContent.bind(client);
      const result = await getWaybackContent("https://wiki.eveuniversity.org/wiki/Rifter", "20230401120000");

      expect(result).toBe(mockContent);
      expect(mockWaybackInstance.get).toHaveBeenCalledWith(
        "https://web.archive.org/web/20230401120000id_/https://wiki.eveuniversity.org/wiki/Rifter",
        { responseType: 'text' }
      );
    });

    it("should retrieve latest snapshot when no timestamp provided", async () => {
      const mockAvailabilityResponse = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Rifter"
            }
          }
        }
      };

      const mockContent = "<html><body><h1>Rifter</h1></body></html>";

      mockWaybackInstance.get
        .mockResolvedValueOnce(mockAvailabilityResponse) // Availability check
        .mockResolvedValueOnce({ data: mockContent }); // Content retrieval

      const getWaybackContent = (client as any).getWaybackContent.bind(client);
      const result = await getWaybackContent("https://wiki.eveuniversity.org/wiki/Rifter");

      expect(result).toBe(mockContent);
      expect(mockWaybackInstance.get).toHaveBeenCalledTimes(2);
    });

    it("should throw error when no archived version is available", async () => {
      const mockAvailabilityResponse = {
        data: {
          archived_snapshots: {}
        }
      };

      mockWaybackInstance.get.mockResolvedValue(mockAvailabilityResponse);

      const getWaybackContent = (client as any).getWaybackContent.bind(client);
      
      await expect(getWaybackContent("https://example.com/nonexistent")).rejects.toThrow(
        "Failed to retrieve from Wayback Machine: Error: No archived version available"
      );
    });
  });

  describe("HTML Text Extraction", () => {
    it("should extract text from HTML content", () => {
      const html = `
        <html>
          <head><title>Rifter</title></head>
          <body>
            <nav>Navigation</nav>
            <div id="mw-content-text">
              <h1>Rifter</h1>
              <p>The Rifter is a Minmatar frigate ship.</p>
              <p>It is known for its speed and agility.</p>
            </div>
            <footer>Footer content</footer>
          </body>
        </html>
      `;

      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      const result = extractTextFromHtml(html);

      expect(result).toContain("Rifter");
      expect(result).toContain("Minmatar frigate");
      expect(result).toContain("speed and agility");
      expect(result).not.toContain("Navigation");
      expect(result).not.toContain("Footer content");
    });

    it("should fallback to body content when main content not found", () => {
      const html = `
        <html>
          <body>
            <h1>Simple Page</h1>
            <p>Simple content without main content div.</p>
          </body>
        </html>
      `;

      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      const result = extractTextFromHtml(html);

      expect(result).toContain("Simple Page");
      expect(result).toContain("Simple content");
    });

    it("should handle malformed HTML gracefully", () => {
      const malformedHtml = "<div><p>Unclosed tags<div>More content";

      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      const result = extractTextFromHtml(malformedHtml);

      expect(result).toContain("Unclosed tags");
      expect(result).toContain("More content");
    });
  });

  describe("Article Retrieval with Fallback", () => {
    it("should use primary source when available", async () => {
      const mockPrimaryResponse = {
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Rifter",
                revisions: [
                  {
                    revid: 456,
                    timestamp: "2023-01-01T00:00:00Z",
                    slots: {
                      main: {
                        "*": "The Rifter is a Minmatar frigate."
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockPrimaryResponse);

      const result = await client.getArticle("Rifter");

      expect(result.title).toBe("Rifter");
      expect(result.content).toBe("The Rifter is a Minmatar frigate.");
      expect(result.pageid).toBe(123);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockWaybackInstance.get).not.toHaveBeenCalled();
    });

    it("should fallback to Wayback Machine when primary source fails", async () => {
      const primaryError = new Error("Primary source unavailable");
      mockAxiosInstance.get.mockRejectedValue(primaryError);

      const mockWaybackAvailability = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Rifter"
            }
          }
        }
      };

      const mockWaybackContent = `
        <html>
          <body>
            <div id="mw-content-text">
              <h1>Rifter</h1>
              <p>The Rifter is a Minmatar frigate ship used in EVE Online.</p>
            </div>
          </body>
        </html>
      `;

      mockWaybackInstance.get
        .mockResolvedValueOnce(mockWaybackAvailability)
        .mockResolvedValueOnce({ data: mockWaybackContent });

      const result = await client.getArticle("Rifter");

      expect(result.title).toBe("Rifter (Archived)");
      expect(result.content).toContain("Rifter");
      expect(result.content).toContain("Minmatar frigate");
      expect(result.pageid).toBe(-1); // Indicates Wayback Machine source
      expect(mockWaybackInstance.get).toHaveBeenCalledTimes(2);
    });

    it("should throw error when both primary and fallback fail", async () => {
      const primaryError = new Error("Primary source unavailable");
      const waybackError = new Error("Wayback Machine unavailable");

      mockAxiosInstance.get.mockRejectedValue(primaryError);
      mockWaybackInstance.get.mockRejectedValue(waybackError);

      await expect(client.getArticle("NonExistent")).rejects.toThrow(
        "Failed to get article \"NonExistent\" from both primary source and Wayback Machine"
      );
    }, 10000);
  });

  describe("Summary Retrieval with Fallback", () => {
    it("should use primary source for summary when available", async () => {
      const mockPrimaryResponse = {
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Rifter",
                extract: "The Rifter is a Minmatar frigate known for its speed."
              }
            }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockPrimaryResponse);

      const result = await client.getSummary("Rifter");

      expect(result).toBe("The Rifter is a Minmatar frigate known for its speed.");
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockWaybackInstance.get).not.toHaveBeenCalled();
    });

    it("should fallback to Wayback Machine for summary when primary fails", async () => {
      const primaryError = new Error("Primary source unavailable");
      mockAxiosInstance.get.mockRejectedValue(primaryError);

      const mockWaybackAvailability = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Rifter"
            }
          }
        }
      };

      const mockWaybackContent = `
        <html>
          <body>
            <div id="mw-content-text">
              <p>The Rifter is a Minmatar frigate ship.</p>
              <p>It is commonly used by new pilots.</p>
            </div>
          </body>
        </html>
      `;

      mockWaybackInstance.get
        .mockResolvedValueOnce(mockWaybackAvailability)
        .mockResolvedValueOnce({ data: mockWaybackContent });

      const result = await client.getSummary("Rifter");

      expect(result).toContain("The Rifter is a Minmatar frigate ship.");
      expect(result).toContain("(Retrieved from archived version)");
      expect(mockWaybackInstance.get).toHaveBeenCalledTimes(2);
    });
  });

  describe("Search with Fallback", () => {
    it("should use primary source for search when available", async () => {
      const mockPrimaryResponse = {
        data: {
          query: {
            search: [
              {
                title: "Rifter",
                snippet: "The <span class=\"searchmatch\">Rifter</span> is a frigate",
                pageid: 123,
                wordcount: 500,
                timestamp: "2023-01-01T00:00:00Z"
              }
            ]
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockPrimaryResponse);

      const result = await client.search("Rifter", 5);

      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Rifter");
      expect(result[0].pageid).toBe(123);
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockWaybackInstance.get).not.toHaveBeenCalled();
    });

    it("should fallback to Wayback Machine for search when primary fails", async () => {
      const primaryError = new Error("Primary source unavailable");
      mockAxiosInstance.get.mockRejectedValue(primaryError);

      const mockWaybackAvailability = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Fitting"
            }
          }
        }
      };

      mockWaybackInstance.get.mockResolvedValue(mockWaybackAvailability);

      const result = await client.search("fitting", 3);

      expect(result.length).toBeGreaterThan(0);
      expect(result[0].title).toContain("(Archived)");
      expect(result[0].pageid).toBe(-1); // Indicates Wayback Machine source
      expect(result[0].snippet).toContain("from Wayback Machine");
    });

    it("should return common EVE pages when search query doesn't match", async () => {
      const primaryError = new Error("Primary source unavailable");
      mockAxiosInstance.get.mockRejectedValue(primaryError);

      const mockWaybackAvailability = {
        data: {
          archived_snapshots: {
            closest: {
              available: true,
              timestamp: "20230401120000",
              url: "https://web.archive.org/web/20230401120000/https://wiki.eveuniversity.org/wiki/Fitting"
            }
          }
        }
      };

      mockWaybackInstance.get.mockResolvedValue(mockWaybackAvailability);

      const result = await client.search("randomquery", 2);

      expect(result.length).toBeLessThanOrEqual(2);
      if (result.length > 0) {
        expect(result[0].title).toContain("(Archived)");
        expect(result[0].pageid).toBe(-1);
      }
    });
  });

  describe("Error Handling", () => {
    it("should handle network timeouts gracefully", async () => {
      const timeoutError = new Error("timeout");
      mockAxiosInstance.get.mockRejectedValue(timeoutError);
      mockWaybackInstance.get.mockRejectedValue(timeoutError);

      await expect(client.getArticle("Test")).rejects.toThrow(
        "Failed to get article \"Test\" from both primary source and Wayback Machine"
      );
    }, 10000);

    it("should handle malformed API responses", async () => {
      mockAxiosInstance.get.mockResolvedValue({ data: null });
      mockWaybackInstance.get.mockRejectedValue(new Error("Wayback error"));

      await expect(client.getArticle("Test")).rejects.toThrow(
        "Failed to get article \"Test\" from both primary source and Wayback Machine"
      );
    }, 10000);
  });

  describe("Performance Considerations", () => {
    it("should not call Wayback Machine when primary source succeeds", async () => {
      const mockPrimaryResponse = {
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                revisions: [
                  {
                    revid: 456,
                    timestamp: "2023-01-01T00:00:00Z",
                    slots: { main: { "*": "content" } }
                  }
                ]
              }
            }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockPrimaryResponse);

      await client.getArticle("Test");

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(1);
      expect(mockWaybackInstance.get).not.toHaveBeenCalled();
    });

    it("should handle concurrent requests efficiently", async () => {
      const mockPrimaryResponse = {
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                revisions: [
                  {
                    revid: 456,
                    timestamp: "2023-01-01T00:00:00Z",
                    slots: { main: { "*": "content" } }
                  }
                ]
              }
            }
          }
        }
      };

      mockAxiosInstance.get.mockResolvedValue(mockPrimaryResponse);

      const promises = [
        client.getArticle("Test1"),
        client.getArticle("Test2"),
        client.getArticle("Test3")
      ];

      const results = await Promise.all(promises);

      expect(results).toHaveLength(3);
      results.forEach(result => {
        expect(result.title).toContain("Test");
        expect(result.pageid).toBe(123);
      });
    });
  });
});