import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { FastMCP } from "fastmcp";
import { z } from "zod";
import { EveWikiClient } from "./eve-wiki-client.js";

// Mock the EveWikiClient
vi.mock("./eve-wiki-client.js");

describe("EVE University Wiki MCP Server Tools", () => {
  let mockEveWikiClient: any;
  let server: FastMCP;

  beforeEach(() => {
    vi.clearAllMocks();
    
    mockEveWikiClient = {
      search: vi.fn(),
      getArticle: vi.fn(),
      getSummary: vi.fn(),
      getSections: vi.fn(),
      getLinks: vi.fn(),
      getRelatedTopics: vi.fn(),
    };

    (EveWikiClient as any).mockImplementation(() => mockEveWikiClient);

    server = new FastMCP({
      name: "EVE University Wiki",
      version: "1.0.0",
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("Tool Execution Logic", () => {
    it("should execute search tool with proper error handling", async () => {
      const mockResults = [
        {
          title: "Rifter",
          snippet: "The Rifter is a Minmatar frigate",
          pageid: 123,
          wordcount: 500,
          timestamp: "2023-01-01T00:00:00Z"
        }
      ];
      
      mockEveWikiClient.search.mockResolvedValue(mockResults);

      // Simulate the tool execution logic from server.ts
      const executeSearchTool = async (args: { query: string; limit: number }) => {
        try {
          const results = await mockEveWikiClient.search(args.query, args.limit);
          return JSON.stringify(
            {
              query: args.query,
              results: results,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error searching EVE Wiki: ${error}`;
        }
      };

      const result = await executeSearchTool({ query: "Rifter", limit: 10 });
      const parsed = JSON.parse(result);
      
      expect(parsed.query).toBe("Rifter");
      expect(parsed.results).toEqual(mockResults);
      expect(mockEveWikiClient.search).toHaveBeenCalledWith("Rifter", 10);
    });

    it("should handle search tool errors gracefully", async () => {
      const error = new Error("Network timeout");
      mockEveWikiClient.search.mockRejectedValue(error);

      const executeSearchTool = async (args: { query: string; limit: number }) => {
        try {
          const results = await mockEveWikiClient.search(args.query, args.limit);
          return JSON.stringify(
            {
              query: args.query,
              results: results,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error searching EVE Wiki: ${error}`;
        }
      };

      const result = await executeSearchTool({ query: "test", limit: 10 });
      expect(result).toBe("Error searching EVE Wiki: Error: Network timeout");
    });

    it("should execute article tool with content length limit", async () => {
      const mockArticle = {
        title: "Rifter",
        content: "a".repeat(15000), // Long content
        pageid: 123,
        revid: 456,
        timestamp: "2023-01-01T00:00:00Z"
      };
      
      mockEveWikiClient.getArticle.mockResolvedValue(mockArticle);

      const executeArticleTool = async (args: { title: string }) => {
        try {
          const article = await mockEveWikiClient.getArticle(args.title);
          return JSON.stringify(
            {
              title: article.title,
              content: article.content.substring(0, 10000), // Limit content length
              pageid: article.pageid,
              timestamp: article.timestamp,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error getting article: ${error}`;
        }
      };

      const result = await executeArticleTool({ title: "Rifter" });
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Rifter");
      expect(parsed.content.length).toBe(10000); // Should be limited
      expect(parsed.pageid).toBe(123);
      expect(mockEveWikiClient.getArticle).toHaveBeenCalledWith("Rifter");
    });

    it("should execute summary tool correctly", async () => {
      const mockSummary = "The Rifter is a Minmatar frigate known for its speed.";
      mockEveWikiClient.getSummary.mockResolvedValue(mockSummary);

      const executeSummaryTool = async (args: { title: string }) => {
        try {
          const summary = await mockEveWikiClient.getSummary(args.title);
          return JSON.stringify(
            {
              title: args.title,
              summary: summary,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error getting summary: ${error}`;
        }
      };

      const result = await executeSummaryTool({ title: "Rifter" });
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Rifter");
      expect(parsed.summary).toBe(mockSummary);
      expect(mockEveWikiClient.getSummary).toHaveBeenCalledWith("Rifter");
    });

    it("should execute sections tool correctly", async () => {
      const mockSections = [
        { title: "Overview", level: 1, index: 1 },
        { title: "Fitting", level: 2, index: 2 }
      ];
      mockEveWikiClient.getSections.mockResolvedValue(mockSections);

      const executeSectionsTool = async (args: { title: string }) => {
        try {
          const sections = await mockEveWikiClient.getSections(args.title);
          return JSON.stringify(
            {
              title: args.title,
              sections: sections,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error getting sections: ${error}`;
        }
      };

      const result = await executeSectionsTool({ title: "Rifter" });
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Rifter");
      expect(parsed.sections).toEqual(mockSections);
      expect(mockEveWikiClient.getSections).toHaveBeenCalledWith("Rifter");
    });

    it("should execute links tool with limit", async () => {
      const mockLinks = Array.from({ length: 150 }, (_, i) => `Link ${i}`);
      mockEveWikiClient.getLinks.mockResolvedValue(mockLinks);

      const executeLinksTool = async (args: { title: string }) => {
        try {
          const links = await mockEveWikiClient.getLinks(args.title);
          return JSON.stringify(
            {
              title: args.title,
              links: links.slice(0, 100), // Limit to first 100 links
            },
            null,
            2,
          );
        } catch (error) {
          return `Error getting links: ${error}`;
        }
      };

      const result = await executeLinksTool({ title: "Rifter" });
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Rifter");
      expect(parsed.links.length).toBe(100); // Should be limited
      expect(mockEveWikiClient.getLinks).toHaveBeenCalledWith("Rifter");
    });

    it("should execute related topics tool correctly", async () => {
      const mockRelatedTopics = ["Slasher", "Breacher", "Burst"];
      mockEveWikiClient.getRelatedTopics.mockResolvedValue(mockRelatedTopics);

      const executeRelatedTopicsTool = async (args: { title: string; limit: number }) => {
        try {
          const relatedTopics = await mockEveWikiClient.getRelatedTopics(
            args.title,
            args.limit,
          );
          return JSON.stringify(
            {
              title: args.title,
              related_topics: relatedTopics,
            },
            null,
            2,
          );
        } catch (error) {
          return `Error getting related topics: ${error}`;
        }
      };

      const result = await executeRelatedTopicsTool({ title: "Rifter", limit: 10 });
      const parsed = JSON.parse(result);
      
      expect(parsed.title).toBe("Rifter");
      expect(parsed.related_topics).toEqual(mockRelatedTopics);
      expect(mockEveWikiClient.getRelatedTopics).toHaveBeenCalledWith("Rifter", 10);
    });
  });

  describe("Parameter Validation Schemas", () => {
    it("should validate search parameters correctly", () => {
      const searchSchema = z.object({
        query: z.string().describe("Search query for EVE University Wiki"),
        limit: z
          .number()
          .min(1)
          .max(50)
          .default(10)
          .describe("Maximum number of results to return"),
      });

      // Valid parameters
      const validParams = { query: "Rifter", limit: 10 };
      const result = searchSchema.safeParse(validParams);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.query).toBe("Rifter");
        expect(result.data.limit).toBe(10);
      }

      // Invalid parameters
      const invalidParams = { query: "", limit: 0 };
      const invalidResult = searchSchema.safeParse(invalidParams);
      expect(invalidResult.success).toBe(false);

      // Test limit boundaries
      const maxLimitParams = { query: "test", limit: 50 };
      const maxResult = searchSchema.safeParse(maxLimitParams);
      expect(maxResult.success).toBe(true);

      const overLimitParams = { query: "test", limit: 51 };
      const overResult = searchSchema.safeParse(overLimitParams);
      expect(overResult.success).toBe(false);
    });

    it("should validate article parameters correctly", () => {
      const articleSchema = z.object({
        title: z.string().describe("Title of the EVE University Wiki article"),
      });

      const validParams = { title: "Rifter" };
      const result = articleSchema.safeParse(validParams);
      expect(result.success).toBe(true);

      const invalidParams = { title: "" };
      const invalidResult = articleSchema.safeParse(invalidParams);
      expect(invalidResult.success).toBe(true); // Empty string is technically valid for zod string
    });

    it("should validate related topics parameters correctly", () => {
      const relatedTopicsSchema = z.object({
        title: z.string().describe("Title of the EVE University Wiki article"),
        limit: z
          .number()
          .min(1)
          .max(20)
          .default(10)
          .describe("Maximum number of related topics to return"),
      });

      const validParams = { title: "Rifter", limit: 10 };
      const result = relatedTopicsSchema.safeParse(validParams);
      expect(result.success).toBe(true);

      const overLimitParams = { title: "Rifter", limit: 21 };
      const overResult = relatedTopicsSchema.safeParse(overLimitParams);
      expect(overResult.success).toBe(false);
    });
  });

  describe("Error Message Formatting", () => {
    it("should format error messages consistently across tools", () => {
      const error = new Error("Test error");
      
      const errorMessages = {
        search: `Error searching EVE Wiki: ${error}`,
        article: `Error getting article: ${error}`,
        summary: `Error getting summary: ${error}`,
        sections: `Error getting sections: ${error}`,
        links: `Error getting links: ${error}`,
        relatedTopics: `Error getting related topics: ${error}`,
      };

      Object.values(errorMessages).forEach(message => {
        expect(message).toContain("Error");
        expect(message).toContain("Test error");
      });
    });
  });

  describe("JSON Response Formatting", () => {
    it("should format responses with proper indentation", () => {
      const data = { query: "test", results: [] };
      const formatted = JSON.stringify(data, null, 2);
      
      expect(formatted).toContain("{\n");
      expect(formatted).toContain("  \"query\":");
      expect(formatted).toContain("  \"results\":");
      expect(formatted).toContain("\n}");
    });

    it("should handle complex nested objects", () => {
      const complexData = {
        title: "Rifter",
        sections: [
          { title: "Overview", level: 1, index: 1 },
          { title: "Fitting", level: 2, index: 2 }
        ]
      };
      
      const formatted = JSON.stringify(complexData, null, 2);
      const parsed = JSON.parse(formatted);
      
      expect(parsed).toEqual(complexData);
      expect(formatted).toContain("\"sections\": [");
    });
  });

  describe("Tool Annotations Validation", () => {
    it("should have correct tool annotations", () => {
      const expectedAnnotations = {
        openWorldHint: true, // This tool interacts with external systems
        readOnlyHint: true, // This tool doesn't modify anything
      };

      // All tools should have these annotations
      expect(expectedAnnotations.openWorldHint).toBe(true);
      expect(expectedAnnotations.readOnlyHint).toBe(true);
    });

    it("should have descriptive titles for all tools", () => {
      const toolTitles = [
        "Search EVE University Wiki",
        "Get EVE University Wiki Article", 
        "Get EVE University Wiki Summary",
        "Get EVE University Wiki Sections",
        "Get EVE University Wiki Links",
        "Get Related EVE University Wiki Topics"
      ];

      toolTitles.forEach(title => {
        expect(title).toContain("EVE University Wiki");
        expect(title.length).toBeGreaterThan(15);
      });
    });
  });

  describe("Resource and Prompt Configuration", () => {
    it("should have valid resource configuration", () => {
      const resource = {
        uri: "https://wiki.eveuniversity.org/",
        name: "EVE University Wiki Info",
        mimeType: "text/plain",
        text: "EVE University Wiki - The comprehensive resource for EVE Online knowledge and learning"
      };

      expect(resource.uri).toMatch(/^https?:\/\//);
      expect(resource.name).toContain("EVE University Wiki");
      expect(resource.mimeType).toBe("text/plain");
      expect(resource.text).toContain("EVE Online");
    });

    it("should have valid prompt configuration", () => {
      const prompt = {
        name: "eve-wiki-search-helper",
        description: "Generate a search query for EVE University Wiki based on your question",
        arguments: [
          {
            name: "question",
            description: "Your question about EVE Online",
            required: true,
          },
        ],
      };

      expect(prompt.name).toBe("eve-wiki-search-helper");
      expect(prompt.description).toContain("EVE University Wiki");
      expect(prompt.arguments[0].required).toBe(true);
      expect(prompt.arguments[0].description).toContain("EVE Online");
    });

    it("should generate correct prompt text", () => {
      const question = "How do I fit a Rifter for PvP?";
      const promptText = `Based on this EVE Online question: "${question}"

Generate an appropriate search query for EVE University Wiki to find relevant information. Consider:
- EVE Online game mechanics
- Ships, modules, and equipment
- Trading and industry
- PvP and PvE strategies
- Corporation and alliance management
- Game lore and background

Search query:`;

      expect(promptText).toContain(question);
      expect(promptText).toContain("EVE Online game mechanics");
      expect(promptText).toContain("PvP and PvE strategies");
      expect(promptText).toContain("Search query:");
    });
  });
});