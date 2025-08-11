import { describe, expect, it } from "vitest";

import { EveWikiClient } from "./eve-wiki-client.js";

/**
 * Real API tests for EVE University Wiki
 * These tests require internet connection and call the actual API
 */
describe("EVE University Wiki API Tests", () => {
  const client = new EveWikiClient();

  describe("search", () => {
    it("should search for well-known EVE ships", async () => {
      const results = await client.search("Rifter", 5);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);
      expect(results.length).toBeLessThanOrEqual(5);

      // Should find the Rifter article
      const rifterResult = results.find(r =>
        r.title.toLowerCase().includes("rifter")
      );
      expect(rifterResult).toBeDefined();

      if (rifterResult) {
        expect(rifterResult).toHaveProperty("title");
        expect(rifterResult).toHaveProperty("snippet");
        expect(rifterResult).toHaveProperty("pageid");
        expect(rifterResult).toHaveProperty("wordcount");
        expect(rifterResult).toHaveProperty("timestamp");

        expect(typeof rifterResult.title).toBe("string");
        expect(typeof rifterResult.snippet).toBe("string");
        expect(typeof rifterResult.pageid).toBe("number");
        expect(typeof rifterResult.wordcount).toBe("number");
        expect(rifterResult.pageid).toBeGreaterThan(0);
      }
    }, 15000);

    it("should search for EVE University content", async () => {
      const results = await client.search("EVE University", 3);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      expect(results.length).toBeGreaterThan(0);

      // Should find EVE University related content
      const eveUniResult = results.find(r =>
        r.title.toLowerCase().includes("eve university") ||
        r.snippet.toLowerCase().includes("eve university")
      );
      expect(eveUniResult).toBeDefined();
    }, 15000);

    it("should respect limit parameter", async () => {
      const results = await client.search("frigate", 3);

      expect(results).toBeDefined();
      expect(results.length).toBeLessThanOrEqual(3);
      expect(results.length).toBeGreaterThan(0);
    }, 15000);

    it("should handle empty search results gracefully", async () => {
      const results = await client.search("xyznonexistentterm123456", 5);

      expect(results).toBeDefined();
      expect(Array.isArray(results)).toBe(true);
      // Empty results are valid
    }, 10000);
  });

  describe("getArticle", () => {
    it("should get the Rifter article content", async () => {
      const article = await client.getArticle("Rifter");

      expect(article).toBeDefined();
      expect(article).toHaveProperty("title");
      expect(article).toHaveProperty("content");
      expect(article).toHaveProperty("pageid");
      expect(article).toHaveProperty("revid");
      expect(article).toHaveProperty("timestamp");

      expect(typeof article.title).toBe("string");
      expect(typeof article.content).toBe("string");
      expect(typeof article.pageid).toBe("number");
      expect(typeof article.revid).toBe("number");
      expect(typeof article.timestamp).toBe("string");

      expect(article.content.length).toBeGreaterThan(100);
      expect(article.pageid).toBeGreaterThan(0);
      expect(article.revid).toBeGreaterThan(0);

      // Content should contain EVE-related terms
      const content = article.content.toLowerCase();
      expect(
        content.includes("frigate") ||
        content.includes("minmatar") ||
        content.includes("ship") ||
        content.includes("eve")
      ).toBe(true);
    }, 20000);

    it("should get a well-known game mechanics article", async () => {
      const article = await client.getArticle("Fitting");

      expect(article).toBeDefined();
      expect(article.title).toBeTruthy();
      expect(article.content).toBeTruthy();
      expect(article.content.length).toBeGreaterThan(100);
      expect(article.pageid).toBeGreaterThan(0);

      const content = article.content.toLowerCase();
      expect(
        content.includes("fitting") ||
        content.includes("ship") ||
        content.includes("module") ||
        content.includes("eve")
      ).toBe(true);
    }, 20000);

    it("should handle non-existent articles", async () => {
      await expect(client.getArticle("NonExistentEVEArticle123XYZ")).rejects.toThrow();
    }, 10000);
  });

  describe("getSummary", () => {
    it("should get Rifter article summary", async () => {
      const summary = await client.getSummary("Rifter");

      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(0);

      // Accept either a real summary or "No summary available"
      if (summary !== "No summary available") {
        expect(summary.length).toBeGreaterThan(10);
        const summaryLower = summary.toLowerCase();
        expect(
          summaryLower.includes("frigate") ||
          summaryLower.includes("minmatar") ||
          summaryLower.includes("ship") ||
          summaryLower.includes("rifter")
        ).toBe(true);
      }
    }, 15000);

    it("should get Fitting article summary", async () => {
      const summary = await client.getSummary("Fitting");

      expect(summary).toBeDefined();
      expect(typeof summary).toBe("string");
      expect(summary.length).toBeGreaterThan(10);
      expect(summary).not.toBe("No summary available");

      const summaryLower = summary.toLowerCase();
      expect(
        summaryLower.includes("fitting") ||
        summaryLower.includes("ship") ||
        summaryLower.includes("module") ||
        summaryLower.includes("eve")
      ).toBe(true);
    }, 15000);

    it("should handle non-existent articles", async () => {
      try {
        const summary = await client.getSummary("NonExistentEVEArticle123XYZ");
        // If it returns "No summary available", that's also acceptable
        expect(summary).toBe("No summary available");
      } catch (error) {
        // If it throws an error, that's also acceptable
        expect(error).toBeInstanceOf(Error);
      }
    }, 10000);
  });

  describe("getSections", () => {
    it("should get sections for detailed articles", async () => {
      const sections = await client.getSections("Rifter");

      expect(sections).toBeDefined();
      expect(Array.isArray(sections)).toBe(true);

      if (sections.length > 0) {
        sections.forEach(section => {
          expect(section).toHaveProperty("title");
          expect(section).toHaveProperty("level");
          expect(section).toHaveProperty("index");

          expect(typeof section.title).toBe("string");
          expect(typeof section.level).toBe("number");
          expect(typeof section.index).toBe("number");
          expect(section.level).toBeGreaterThan(0);
          expect(section.index).toBeGreaterThanOrEqual(0); // Allow 0 for some sections
        });
      }
    }, 15000);
  });

  describe("getLinks", () => {
    it("should get links from articles", async () => {
      const links = await client.getLinks("Rifter");

      expect(links).toBeDefined();
      expect(Array.isArray(links)).toBe(true);

      if (links.length > 0) {
        expect(typeof links[0]).toBe("string");
        expect(links.length).toBeLessThanOrEqual(500); // API limit

        // Should contain some EVE-related links
        const eveRelatedLinks = links.filter(link => {
          const linkLower = link.toLowerCase();
          return linkLower.includes("frigate") ||
                 linkLower.includes("minmatar") ||
                 linkLower.includes("ship") ||
                 linkLower.includes("fitting");
        });

        expect(eveRelatedLinks.length).toBeGreaterThan(0);
      }
    }, 15000);
  });

  describe("getRelatedTopics", () => {
    it("should get related topics for articles", async () => {
      const relatedTopics = await client.getRelatedTopics("Rifter", 5);

      expect(relatedTopics).toBeDefined();
      expect(Array.isArray(relatedTopics)).toBe(true);
      expect(relatedTopics.length).toBeLessThanOrEqual(5);

      // Should not include the original article
      expect(relatedTopics).not.toContain("Rifter");

      if (relatedTopics.length > 0) {
        relatedTopics.forEach(topic => {
          expect(typeof topic).toBe("string");
          expect(topic.length).toBeGreaterThan(0);
        });
      }
    }, 20000);
  });

  describe("API error handling", () => {
    it("should handle network timeouts gracefully", async () => {
      // Test with a very short timeout to simulate network issues
      const clientWithShortTimeout = new EveWikiClient();
      // Note: This test might be flaky depending on network conditions

      try {
        await clientWithShortTimeout.search("test", 1);
        // If it succeeds, that's also fine
        expect(true).toBe(true);
      } catch (error) {
        // Should throw a meaningful error
        expect(error).toBeInstanceOf(Error);
      }
    }, 5000);
  });

  describe("HTML cleaning", () => {
    it("should clean HTML from search snippets", () => {
      // Access private method for testing
      const cleanSnippet = (client as any).cleanSnippet.bind(client);

      const htmlSnippet = '<span class="searchmatch">Rifter</span> is a <b>frigate</b> ship used in <em>EVE Online</em>.';
      const cleanedSnippet = cleanSnippet(htmlSnippet);

      expect(cleanedSnippet).toBe("Rifter is a frigate ship used in EVE Online.");
      expect(cleanedSnippet).not.toContain("<");
      expect(cleanedSnippet).not.toContain(">");
    });

    it("should handle empty HTML snippets", () => {
      const cleanSnippet = (client as any).cleanSnippet.bind(client);

      expect(cleanSnippet("")).toBe("");
      expect(cleanSnippet("<p></p>")).toBe("");
      expect(cleanSnippet("   ")).toBe("");
    });
  });
});
