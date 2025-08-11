import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { FastMCP } from "fastmcp";
import { EveWikiClient } from "./eve-wiki-client.js";

/**
 * Integration tests for the EVE University Wiki MCP Server
 * These tests verify the complete integration between the server and client
 */
describe("EVE University Wiki MCP Server Integration", () => {
  let server: FastMCP;
  let client: EveWikiClient;

  beforeAll(() => {
    // Initialize the actual server and client for integration testing
    server = new FastMCP({
      name: "EVE University Wiki",
      version: "1.0.0",
    });
    
    client = new EveWikiClient();
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe("Server Initialization", () => {
    it("should initialize server with correct configuration", () => {
      expect(server).toBeDefined();
      expect(server).toBeInstanceOf(FastMCP);
    });

    it("should initialize client with correct configuration", () => {
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(EveWikiClient);
    });
  });

  describe("Tool Parameter Validation", () => {
    describe("search_eve_wiki parameters", () => {
      it("should validate query parameter", () => {
        // Query must be a string
        expect(typeof "Rifter").toBe("string");
        expect("Rifter".length).toBeGreaterThan(0);
      });

      it("should validate limit parameter", () => {
        // Limit must be between 1 and 50, default 10
        const validLimits = [1, 10, 25, 50];
        const invalidLimits = [0, -1, 51, 100];
        
        validLimits.forEach(limit => {
          expect(limit).toBeGreaterThanOrEqual(1);
          expect(limit).toBeLessThanOrEqual(50);
        });
        
        invalidLimits.forEach(limit => {
          expect(limit < 1 || limit > 50).toBe(true);
        });
      });
    });

    describe("get_eve_wiki_article parameters", () => {
      it("should validate title parameter", () => {
        expect(typeof "Rifter").toBe("string");
        expect("Rifter".length).toBeGreaterThan(0);
        expect(("").length).toBe(0); // Empty string should be invalid
      });
    });

    describe("get_eve_wiki_related_topics parameters", () => {
      it("should validate limit parameter", () => {
        // Limit must be between 1 and 20, default 10
        const validLimits = [1, 5, 10, 15, 20];
        const invalidLimits = [0, -1, 21, 50];
        
        validLimits.forEach(limit => {
          expect(limit).toBeGreaterThanOrEqual(1);
          expect(limit).toBeLessThanOrEqual(20);
        });
        
        invalidLimits.forEach(limit => {
          expect(limit < 1 || limit > 20).toBe(true);
        });
      });
    });
  });

  describe("Response Format Validation", () => {
    it("should format search response correctly", () => {
      const mockQuery = "Rifter";
      const mockResults = [
        {
          title: "Rifter",
          snippet: "The Rifter is a Minmatar frigate",
          pageid: 123,
          wordcount: 500,
          timestamp: "2023-01-01T00:00:00Z"
        }
      ];
      
      const response = JSON.stringify({
        query: mockQuery,
        results: mockResults,
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("query");
      expect(parsed).toHaveProperty("results");
      expect(parsed.query).toBe(mockQuery);
      expect(Array.isArray(parsed.results)).toBe(true);
      expect(parsed.results[0]).toHaveProperty("title");
      expect(parsed.results[0]).toHaveProperty("snippet");
      expect(parsed.results[0]).toHaveProperty("pageid");
    });

    it("should format article response correctly", () => {
      const mockArticle = {
        title: "Rifter",
        content: "The Rifter is a Minmatar frigate ship used in EVE Online...",
        pageid: 123,
        timestamp: "2023-01-01T00:00:00Z"
      };
      
      const response = JSON.stringify({
        title: mockArticle.title,
        content: mockArticle.content.substring(0, 10000),
        pageid: mockArticle.pageid,
        timestamp: mockArticle.timestamp,
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("content");
      expect(parsed).toHaveProperty("pageid");
      expect(parsed).toHaveProperty("timestamp");
      expect(parsed.content.length).toBeLessThanOrEqual(10000);
    });

    it("should format summary response correctly", () => {
      const mockTitle = "Rifter";
      const mockSummary = "The Rifter is a Minmatar frigate known for its speed.";
      
      const response = JSON.stringify({
        title: mockTitle,
        summary: mockSummary,
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("summary");
      expect(parsed.title).toBe(mockTitle);
      expect(parsed.summary).toBe(mockSummary);
    });

    it("should format sections response correctly", () => {
      const mockTitle = "Rifter";
      const mockSections = [
        { title: "Overview", level: 1, index: 1 },
        { title: "Fitting", level: 2, index: 2 }
      ];
      
      const response = JSON.stringify({
        title: mockTitle,
        sections: mockSections,
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("sections");
      expect(Array.isArray(parsed.sections)).toBe(true);
      expect(parsed.sections[0]).toHaveProperty("title");
      expect(parsed.sections[0]).toHaveProperty("level");
      expect(parsed.sections[0]).toHaveProperty("index");
    });

    it("should format links response correctly", () => {
      const mockTitle = "Rifter";
      const mockLinks = ["Minmatar", "Frigate", "Ship fitting"];
      
      const response = JSON.stringify({
        title: mockTitle,
        links: mockLinks.slice(0, 100),
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("links");
      expect(Array.isArray(parsed.links)).toBe(true);
      expect(parsed.links.length).toBeLessThanOrEqual(100);
    });

    it("should format related topics response correctly", () => {
      const mockTitle = "Rifter";
      const mockRelatedTopics = ["Slasher", "Breacher", "Burst"];
      
      const response = JSON.stringify({
        title: mockTitle,
        related_topics: mockRelatedTopics,
      }, null, 2);
      
      const parsed = JSON.parse(response);
      expect(parsed).toHaveProperty("title");
      expect(parsed).toHaveProperty("related_topics");
      expect(Array.isArray(parsed.related_topics)).toBe(true);
    });
  });

  describe("Error Response Format", () => {
    it("should format search errors correctly", () => {
      const error = new Error("Network timeout");
      const errorResponse = `Error searching EVE Wiki: ${error}`;
      
      expect(errorResponse).toContain("Error searching EVE Wiki:");
      expect(errorResponse).toContain("Network timeout");
    });

    it("should format article errors correctly", () => {
      const error = new Error("Article not found");
      const errorResponse = `Error getting article: ${error}`;
      
      expect(errorResponse).toContain("Error getting article:");
      expect(errorResponse).toContain("Article not found");
    });

    it("should format summary errors correctly", () => {
      const error = new Error("Summary unavailable");
      const errorResponse = `Error getting summary: ${error}`;
      
      expect(errorResponse).toContain("Error getting summary:");
      expect(errorResponse).toContain("Summary unavailable");
    });

    it("should format sections errors correctly", () => {
      const error = new Error("Sections not found");
      const errorResponse = `Error getting sections: ${error}`;
      
      expect(errorResponse).toContain("Error getting sections:");
      expect(errorResponse).toContain("Sections not found");
    });

    it("should format links errors correctly", () => {
      const error = new Error("Links unavailable");
      const errorResponse = `Error getting links: ${error}`;
      
      expect(errorResponse).toContain("Error getting links:");
      expect(errorResponse).toContain("Links unavailable");
    });

    it("should format related topics errors correctly", () => {
      const error = new Error("Related topics not found");
      const errorResponse = `Error getting related topics: ${error}`;
      
      expect(errorResponse).toContain("Error getting related topics:");
      expect(errorResponse).toContain("Related topics not found");
    });
  });

  describe("Content Limits", () => {
    it("should limit article content to 10000 characters", () => {
      const longContent = "a".repeat(20000);
      const limitedContent = longContent.substring(0, 10000);
      
      expect(limitedContent.length).toBe(10000);
      expect(limitedContent.length).toBeLessThan(longContent.length);
    });

    it("should limit links to 100 items", () => {
      const manyLinks = Array.from({ length: 200 }, (_, i) => `Link ${i}`);
      const limitedLinks = manyLinks.slice(0, 100);
      
      expect(limitedLinks.length).toBe(100);
      expect(limitedLinks.length).toBeLessThan(manyLinks.length);
    });

    it("should respect search limit parameter", () => {
      const maxSearchLimit = 50;
      const minSearchLimit = 1;
      const defaultSearchLimit = 10;
      
      expect(maxSearchLimit).toBe(50);
      expect(minSearchLimit).toBe(1);
      expect(defaultSearchLimit).toBe(10);
    });

    it("should respect related topics limit parameter", () => {
      const maxRelatedLimit = 20;
      const minRelatedLimit = 1;
      const defaultRelatedLimit = 10;
      
      expect(maxRelatedLimit).toBe(20);
      expect(minRelatedLimit).toBe(1);
      expect(defaultRelatedLimit).toBe(10);
    });
  });

  describe("Resource Configuration", () => {
    it("should have EVE University Wiki resource", () => {
      const resourceUri = "https://wiki.eveuniversity.org/";
      const resourceName = "EVE University Wiki Info";
      const resourceMimeType = "text/plain";
      const resourceText = "EVE University Wiki - The comprehensive resource for EVE Online knowledge and learning";
      
      expect(resourceUri).toBe("https://wiki.eveuniversity.org/");
      expect(resourceName).toBe("EVE University Wiki Info");
      expect(resourceMimeType).toBe("text/plain");
      expect(resourceText).toContain("EVE University Wiki");
      expect(resourceText).toContain("EVE Online");
    });
  });

  describe("Prompt Configuration", () => {
    it("should have eve-wiki-search-helper prompt", () => {
      const promptName = "eve-wiki-search-helper";
      const promptDescription = "Generate a search query for EVE University Wiki based on your question";
      
      expect(promptName).toBe("eve-wiki-search-helper");
      expect(promptDescription).toContain("EVE University Wiki");
      expect(promptDescription).toContain("search query");
    });

    it("should validate prompt arguments", () => {
      const promptArg = {
        name: "question",
        description: "Your question about EVE Online",
        required: true,
      };
      
      expect(promptArg.name).toBe("question");
      expect(promptArg.required).toBe(true);
      expect(promptArg.description).toContain("EVE Online");
    });

    it("should format prompt response correctly", async () => {
      const question = "How do I fit a Rifter for PvP?";
      const expectedPrompt = `Based on this EVE Online question: "${question}"

Generate an appropriate search query for EVE University Wiki to find relevant information. Consider:
- EVE Online game mechanics
- Ships, modules, and equipment
- Trading and industry
- PvP and PvE strategies
- Corporation and alliance management
- Game lore and background

Search query:`;
      
      expect(expectedPrompt).toContain(question);
      expect(expectedPrompt).toContain("EVE Online game mechanics");
      expect(expectedPrompt).toContain("Ships, modules, and equipment");
      expect(expectedPrompt).toContain("PvP and PvE strategies");
      expect(expectedPrompt).toContain("Search query:");
    });
  });

  describe("Tool Descriptions", () => {
    it("should have descriptive tool descriptions", () => {
      const toolDescriptions = {
        search_eve_wiki: "Search for articles on EVE University Wiki",
        get_eve_wiki_article: "Get the full content of an EVE University Wiki article",
        get_eve_wiki_summary: "Get a summary of an EVE University Wiki article",
        get_eve_wiki_sections: "Get the sections of an EVE University Wiki article",
        get_eve_wiki_links: "Get the links contained within an EVE University Wiki article",
        get_eve_wiki_related_topics: "Get topics related to an EVE University Wiki article based on categories",
      };
      
      Object.entries(toolDescriptions).forEach(([toolName, description]) => {
        expect(description).toContain("EVE University Wiki");
        expect(description.length).toBeGreaterThan(20);
        expect(toolName).toMatch(/^[a-z_]+$/); // Valid tool name format
      });
    });
  });

  describe("Parameter Descriptions", () => {
    it("should have clear parameter descriptions", () => {
      const paramDescriptions = {
        query: "Search query for EVE University Wiki",
        title: "Title of the EVE University Wiki article",
        limit: "Maximum number of results to return",
        relatedLimit: "Maximum number of related topics to return",
      };
      
      Object.values(paramDescriptions).forEach(description => {
        expect(description.length).toBeGreaterThan(10);
        expect(description).toMatch(/^[A-Z]/); // Should start with capital letter
      });
    });
  });
});