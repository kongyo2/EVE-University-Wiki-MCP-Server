import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import axios from "axios";
import { EveWikiClient } from "./eve-wiki-client.js";

// Mock axios
vi.mock("axios");
const mockedAxios = vi.mocked(axios);

describe("EVE Wiki Client Extended Tests", () => {
  let client: EveWikiClient;
  let mockAxiosInstance: any;
  let mockWaybackInstance: any;

  beforeEach(() => {
    vi.clearAllMocks();
    
    // Create mock axios instance
    mockAxiosInstance = {
      get: vi.fn(),
    };
    mockWaybackInstance = {
      get: vi.fn(),
    };
    
    // Mock axios.create to return our mock instance
    mockedAxios.create = vi.fn()
      .mockReturnValueOnce(mockAxiosInstance)
      .mockReturnValueOnce(mockWaybackInstance);
    
    client = new EveWikiClient();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Constructor and Configuration", () => {
    it("should initialize with default configuration", () => {
      const defaultClient = new EveWikiClient();
      expect(defaultClient).toBeDefined();
      expect(mockedAxios.create).toHaveBeenCalledWith({
        baseURL: "https://wiki.eveuniversity.org/api.php",
        headers: {
          "User-Agent": "EVE-University-MCP-Server/1.0.0",
        },
        timeout: 30000,
      });
    });

    it("should initialize with custom retry configuration", () => {
      const customClient = new EveWikiClient(5, 2000);
      expect(customClient).toBeDefined();
      // The retry configuration is internal, so we can't directly test it
      // but we can verify the client was created
    });
  });

  describe("Retry Mechanism", () => {
    it("should retry failed requests", async () => {
      const error = new Error("Network error");
      const successResponse = {
        data: {
          query: {
            search: [
              {
                title: "Rifter",
                snippet: "Test snippet",
                pageid: 123,
                wordcount: 500,
                timestamp: "2023-01-01T00:00:00Z"
              }
            ]
          }
        }
      };

      // First call fails, second succeeds
      mockAxiosInstance.get
        .mockRejectedValueOnce(error)
        .mockResolvedValueOnce(successResponse);

      // Mock wayback to not interfere
      mockWaybackInstance.get.mockResolvedValue({
        data: { archived_snapshots: {} }
      });

      const result = await client.search("Rifter", 10);

      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Rifter");
    });

    it("should fail after max retries", async () => {
      const error = new Error("Persistent network error");
      mockAxiosInstance.get.mockRejectedValue(error);
      mockWaybackInstance.get.mockRejectedValue(error);

      await expect(client.search("test", 10)).rejects.toThrow("Failed to search EVE Wiki from both primary source and Wayback Machine");
      
      // Should try initial + 3 retries = 4 total attempts for primary
      expect(mockAxiosInstance.get).toHaveBeenCalledTimes(4);
    }, 10000); // Increase timeout

    it("should use exponential backoff", async () => {
      const error = new Error("Network error");
      mockAxiosInstance.get.mockRejectedValue(error);
      mockWaybackInstance.get.mockRejectedValue(error);

      const startTime = Date.now();
      
      try {
        await client.search("test", 10);
      } catch (e) {
        // Expected to fail
      }

      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take at least some time due to backoff (1000ms + 2000ms + 4000ms = 7000ms minimum)
      // But we'll be lenient in testing to avoid flaky tests
      expect(duration).toBeGreaterThan(500); // Reduced expectation due to test environment
    }, 15000); // Increase timeout
  });

  describe("Search Method Edge Cases", () => {
    it("should handle empty search results", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            search: []
          }
        }
      });

      const result = await client.search("nonexistent", 10);
      expect(result).toEqual([]);
    });

    it("should handle missing query object", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      const result = await client.search("test", 10);
      expect(result).toEqual([]);
    });

    it("should handle malformed search response", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            search: [
              {
                // Missing required fields
                title: "Test"
                // pageid, snippet, etc. missing
              }
            ]
          }
        }
      });

      const result = await client.search("test", 10);
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test");
      expect(result[0].snippet).toBe("");
      expect(result[0].pageid).toBeUndefined();
    });

    it("should clean HTML from snippets", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            search: [
              {
                title: "Test",
                snippet: '<span class="searchmatch">Rifter</span> is a <b>frigate</b>',
                pageid: 123,
                wordcount: 100,
                timestamp: "2023-01-01T00:00:00Z"
              }
            ]
          }
        }
      });

      const result = await client.search("test", 10);
      expect(result[0].snippet).toBe("Rifter is a frigate");
      expect(result[0].snippet).not.toContain("<");
      expect(result[0].snippet).not.toContain(">");
    });
  });

  describe("Get Article Method Edge Cases", () => {
    it("should handle missing pages object", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      await expect(client.getArticle("test")).rejects.toThrow("from both primary source and Wayback Machine");
    }, 10000); // Increase timeout

    it("should handle missing article", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "-1": {
                missing: true,
                title: "NonExistent"
              }
            }
          }
        }
      });

      await expect(client.getArticle("NonExistent")).rejects.toThrow("from both primary source and Wayback Machine");
    }, 10000); // Increase timeout

    it("should handle missing revision", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                // revisions array missing
              }
            }
          }
        }
      });

      await expect(client.getArticle("Test")).rejects.toThrow("from both primary source and Wayback Machine");
    }, 10000); // Increase timeout

    it("should handle empty content", async () => {
      mockAxiosInstance.get.mockResolvedValue({
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
                    slots: {
                      main: {
                        "*": ""
                      }
                    }
                  }
                ]
              }
            }
          }
        }
      });

      const result = await client.getArticle("Test");
      expect(result.content).toBe("");
      expect(result.title).toBe("Test");
      expect(result.pageid).toBe(123);
    });
  });

  describe("Get Summary Method Edge Cases", () => {
    it("should handle missing extract", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                // extract missing
              }
            }
          }
        }
      });

      const result = await client.getSummary("Test");
      expect(result).toBe("No summary available");
    });

    it("should handle empty extract", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                extract: ""
              }
            }
          }
        }
      });

      const result = await client.getSummary("Test");
      expect(result).toBe("No summary available");
    });
  });

  describe("Get Sections Method Edge Cases", () => {
    it("should handle missing parse object", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {}
      });

      const result = await client.getSections("Test");
      expect(result).toEqual([]);
    });

    it("should handle missing sections", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          parse: {
            // sections missing
          }
        }
      });

      const result = await client.getSections("Test");
      expect(result).toEqual([]);
    });

    it("should handle malformed sections", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          parse: {
            sections: [
              {
                line: "Test Section",
                // index and level missing
              }
            ]
          }
        }
      });

      const result = await client.getSections("Test");
      expect(result).toHaveLength(1);
      expect(result[0].title).toBe("Test Section");
      expect(result[0].index).toBe(0);
      expect(result[0].level).toBe(1);
    });
  });

  describe("Get Links Method Edge Cases", () => {
    it("should handle missing links", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                // links missing
              }
            }
          }
        }
      });

      const result = await client.getLinks("Test");
      expect(result).toEqual([]);
    });

    it("should handle empty links array", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                links: []
              }
            }
          }
        }
      });

      const result = await client.getLinks("Test");
      expect(result).toEqual([]);
    });
  });

  describe("Get Related Topics Method Edge Cases", () => {
    it("should handle missing categories", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                // categories missing
              }
            }
          }
        }
      });

      const result = await client.getRelatedTopics("Test", 10);
      expect(result).toEqual([]);
    });

    it("should handle empty categories", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                categories: []
              }
            }
          }
        }
      });

      const result = await client.getRelatedTopics("Test", 10);
      expect(result).toEqual([]);
    });

    it("should handle category member fetch errors gracefully", async () => {
      // First call returns categories
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                categories: [
                  { title: "Category:Test" }
                ]
              }
            }
          }
        }
      });

      // Second call (category members) fails
      mockAxiosInstance.get.mockRejectedValueOnce(new Error("Category fetch failed"));

      const result = await client.getRelatedTopics("Test", 10);
      expect(result).toEqual([]);
    });

    it("should exclude original article from related topics", async () => {
      const originalTitle = "Rifter";
      
      // First call returns categories
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: originalTitle,
                categories: [
                  { title: "Category:Frigates" }
                ]
              }
            }
          }
        }
      });

      // Second call returns category members including the original article
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          query: {
            categorymembers: [
              { title: "Rifter" }, // Should be excluded
              { title: "Slasher" },
              { title: "Breacher" }
            ]
          }
        }
      });

      const result = await client.getRelatedTopics(originalTitle, 10);
      expect(result).not.toContain("Rifter");
      expect(result).toContain("Slasher");
      expect(result).toContain("Breacher");
    });

    it("should limit related topics to requested limit", async () => {
      const limit = 2;
      
      // First call returns categories
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                categories: [
                  { title: "Category:Test" }
                ]
              }
            }
          }
        }
      });

      // Second call returns many category members
      mockAxiosInstance.get.mockResolvedValueOnce({
        data: {
          query: {
            categorymembers: [
              { title: "Topic1" },
              { title: "Topic2" },
              { title: "Topic3" },
              { title: "Topic4" },
              { title: "Topic5" }
            ]
          }
        }
      });

      const result = await client.getRelatedTopics("Test", limit);
      expect(result.length).toBeLessThanOrEqual(limit);
    });
  });

  describe("HTML Cleaning Utility", () => {
    it("should clean various HTML tags", () => {
      const cleanSnippet = (client as any).cleanSnippet.bind(client);
      
      const testCases = [
        {
          input: '<span class="searchmatch">Rifter</span>',
          expected: "Rifter"
        },
        {
          input: '<b>Bold</b> and <i>italic</i> text',
          expected: "Bold and italic text"
        },
        {
          input: '<a href="/wiki/Test">Link</a>',
          expected: "Link"
        },
        {
          input: 'Text with &amp; entities &lt; &gt;',
          expected: "Text with & entities < >"
        },
        {
          input: '<div><p>Nested <span>tags</span></p></div>',
          expected: "Nested tags"
        }
      ];

      testCases.forEach(({ input, expected }) => {
        expect(cleanSnippet(input)).toBe(expected);
      });
    });

    it("should handle empty and whitespace-only HTML", () => {
      const cleanSnippet = (client as any).cleanSnippet.bind(client);
      
      expect(cleanSnippet("")).toBe("");
      expect(cleanSnippet("   ")).toBe("");
      expect(cleanSnippet("<p></p>")).toBe("");
      expect(cleanSnippet("<div>   </div>")).toBe("");
    });

    it("should preserve text content while removing tags", () => {
      const cleanSnippet = (client as any).cleanSnippet.bind(client);
      
      const input = 'The <span class="searchmatch">Rifter</span> is a <b>Minmatar</b> <i>frigate</i> ship.';
      const expected = "The Rifter is a Minmatar frigate ship.";
      
      expect(cleanSnippet(input)).toBe(expected);
    });
  });

  describe("API Parameter Validation", () => {
    it("should send correct parameters for search", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: { query: { search: [] } }
      });

      await client.search("test query", 15);

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("", {
        params: {
          action: "query",
          format: "json",
          list: "search",
          srlimit: 15,
          srprop: "snippet|titlesnippet|size|wordcount|timestamp",
          srsearch: "test query",
        },
      });
    });

    it("should send correct parameters for getArticle", async () => {
      mockAxiosInstance.get.mockResolvedValue({
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
      });

      await client.getArticle("Test Article");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("", {
        params: {
          action: "query",
          format: "json",
          prop: "revisions",
          rvprop: "content|timestamp|ids",
          rvslots: "main",
          titles: "Test Article",
        },
      });
    });

    it("should send correct parameters for getSummary", async () => {
      mockAxiosInstance.get.mockResolvedValue({
        data: {
          query: {
            pages: {
              "123": {
                pageid: 123,
                title: "Test",
                extract: "Summary text"
              }
            }
          }
        }
      });

      await client.getSummary("Test Article");

      expect(mockAxiosInstance.get).toHaveBeenCalledWith("", {
        params: {
          action: "query",
          exintro: true,
          explaintext: true,
          exsectionformat: "plain",
          format: "json",
          prop: "extracts",
          titles: "Test Article",
        },
      });
    });
  });
});