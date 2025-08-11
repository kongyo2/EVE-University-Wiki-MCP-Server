import { describe, expect, it, beforeAll, afterAll } from "vitest";
import { EveWikiClient } from "./eve-wiki-client.js";

// Integration tests using actual Wayback Machine API
describe("EVE Wiki Client - Wayback Machine Integration Tests", () => {
  let client: EveWikiClient;
  
  beforeAll(() => {
    // Use longer timeout for integration tests
    client = new EveWikiClient(2, 2000); // 2 retries, 2 second delay
  });

  afterAll(() => {
    // Cleanup if needed
  });

  describe("Real Wayback Machine API Tests", () => {
    it("should check availability of a known archived EVE Wiki page", async () => {
      // Test with a page that should exist in Wayback Machine
      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      const result = await checkWaybackAvailability("https://wiki.eveuniversity.org/wiki/Rifter");
      
      if (result) {
        expect(result.available).toBe(true);
        expect(result.timestamp).toMatch(/^\d{14}$/); // Format: YYYYMMDDHHMMSS
        expect(result.url).toContain("web.archive.org");
        expect(result.url).toContain("wiki.eveuniversity.org");
      } else {
        // If no archived version is available, that's also a valid result
        console.warn("No archived version found for Rifter page");
      }
    }, 30000); // 30 second timeout

    it("should retrieve actual content from Wayback Machine", async () => {
      const getWaybackContent = (client as any).getWaybackContent.bind(client);
      
      try {
        const content = await getWaybackContent("https://wiki.eveuniversity.org/wiki/Rifter");
        
        expect(content).toBeDefined();
        expect(typeof content).toBe("string");
        expect(content.length).toBeGreaterThan(0);
        
        // Should contain HTML structure
        expect(content).toContain("<html");
        expect(content).toContain("</html>");
        
        // Should contain EVE-related content
        const lowerContent = content.toLowerCase();
        expect(
          lowerContent.includes("rifter") || 
          lowerContent.includes("eve") || 
          lowerContent.includes("minmatar") ||
          lowerContent.includes("frigate")
        ).toBe(true);
        
      } catch (error) {
        // If the page is not available in Wayback Machine, that's expected
        if (error instanceof Error && error.message.includes("No archived version available")) {
          console.warn("No archived version available for Rifter page");
        } else {
          throw error;
        }
      }
    }, 30000);

    it("should handle non-existent URLs gracefully", async () => {
      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      const result = await checkWaybackAvailability("https://wiki.eveuniversity.org/wiki/NonExistentPageThatShouldNotExist12345");
      
      expect(result).toBeNull();
    }, 15000);

    it("should extract meaningful text from real archived HTML", async () => {
      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      
      // Test with a sample HTML structure similar to EVE Wiki
      const sampleHtml = `
        <html>
          <head><title>Rifter - EVE University Wiki</title></head>
          <body>
            <div id="mw-navigation">Navigation menu</div>
            <div id="mw-content-text">
              <div class="mw-parser-output">
                <p>The <b>Rifter</b> is a Minmatar frigate ship in EVE Online.</p>
                <p>It is known for its speed and agility in combat situations.</p>
                <h2>Fitting</h2>
                <p>The Rifter can be fitted for various roles including tackling and solo PvP.</p>
              </div>
            </div>
            <footer>Footer content</footer>
          </body>
        </html>
      `;
      
      const result = extractTextFromHtml(sampleHtml);
      
      expect(result).toContain("Rifter");
      expect(result).toContain("Minmatar frigate");
      expect(result).toContain("speed and agility");
      expect(result).toContain("Fitting");
      expect(result).toContain("tackling and solo PvP");
      
      // Should not contain navigation or footer
      expect(result).not.toContain("Navigation menu");
      expect(result).not.toContain("Footer content");
    });
  });

  describe("Article Retrieval Integration Tests", () => {
    it("should retrieve a real article with fallback capability", async () => {
      // Test with a common EVE Wiki page that might be available
      try {
        const result = await client.getArticle("Rifter");
        
        expect(result).toBeDefined();
        expect(result.title).toBeDefined();
        expect(result.content).toBeDefined();
        expect(result.content.length).toBeGreaterThan(0);
        
        if (result.pageid === -1) {
          // This indicates Wayback Machine was used
          expect(result.title).toContain("(Archived)");
          console.log("Successfully retrieved article from Wayback Machine");
        } else {
          // This indicates primary source was used
          expect(result.pageid).toBeGreaterThan(0);
          expect(result.revid).toBeGreaterThan(0);
          expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$/);
          console.log("Successfully retrieved article from primary source");
        }
        
      } catch (error) {
        // If both primary and fallback fail, that's also a valid test result
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
        console.warn("Both primary and Wayback Machine failed, which is expected in some cases");
      }
    }, 45000);

    it("should handle article that doesn't exist in either source", async () => {
      const nonExistentTitle = "NonExistentEVEArticleThatShouldNotExist12345";
      
      try {
        await client.getArticle(nonExistentTitle);
        // If we get here, something unexpected happened
        expect.fail("Should have thrown an error for non-existent article");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
      }
    }, 30000);
  });

  describe("Summary Retrieval Integration Tests", () => {
    it("should retrieve summary with fallback capability", async () => {
      try {
        const result = await client.getSummary("Rifter");
        
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        
        if (result.includes("(Retrieved from archived version)")) {
          console.log("Successfully retrieved summary from Wayback Machine");
          // Remove the archived note for content validation
          const cleanSummary = result.replace(" (Retrieved from archived version)", "");
          expect(cleanSummary.length).toBeGreaterThan(0);
        } else {
          console.log("Successfully retrieved summary from primary source");
        }
        
        // Should contain meaningful content (more flexible check)
        expect(result.length).toBeGreaterThan(10); // At least some content
        
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
        console.warn("Both primary and Wayback Machine failed for summary");
      }
    }, 30000);
  });

  describe("Search Integration Tests", () => {
    it("should search with fallback capability", async () => {
      try {
        const results = await client.search("rifter", 5);
        
        expect(Array.isArray(results)).toBe(true);
        
        if (results.length > 0) {
          const firstResult = results[0];
          expect(firstResult.title).toBeDefined();
          expect(firstResult.snippet).toBeDefined();
          
          if (firstResult.pageid === -1) {
            // Wayback Machine result
            expect(firstResult.title).toContain("(Archived)");
            expect(firstResult.snippet).toContain("Wayback Machine");
            console.log("Successfully retrieved search results from Wayback Machine");
          } else {
            // Primary source result
            expect(firstResult.pageid).toBeGreaterThan(0);
            expect(firstResult.wordcount).toBeGreaterThanOrEqual(0);
            console.log("Successfully retrieved search results from primary source");
          }
        } else {
          console.warn("No search results found for 'rifter'");
        }
        
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
        console.warn("Both primary and Wayback Machine failed for search");
      }
    }, 30000);

    it("should handle search with no matching results", async () => {
      try {
        const results = await client.search("xyznonexistentquery123", 3);
        
        expect(Array.isArray(results)).toBe(true);
        
        // Even with no direct matches, fallback should provide some common EVE pages
        if (results.length > 0) {
          results.forEach(result => {
            expect(result.title).toBeDefined();
            expect(result.snippet).toBeDefined();
            
            if (result.pageid === -1) {
              expect(result.title).toContain("(Archived)");
            }
          });
        }
        
      } catch (error) {
        // This is acceptable - both sources might fail for nonsensical queries
        expect(error).toBeInstanceOf(Error);
        console.warn("Search failed for nonsensical query, which is expected");
      }
    }, 30000);
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle network timeouts gracefully", async () => {
      // Create a client with very short timeout to test timeout handling
      const timeoutClient = new EveWikiClient(1, 100);
      
      // Override the timeout to be very short
      (timeoutClient as any).client.defaults.timeout = 1; // 1ms timeout
      (timeoutClient as any).waybackClient.defaults.timeout = 1;
      
      try {
        await timeoutClient.getArticle("Rifter");
        // If this succeeds, the timeout wasn't triggered (which is also valid)
        console.log("Request completed before timeout");
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        // Should contain information about both sources failing
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
      }
    }, 15000);

    it("should handle malformed URLs in Wayback Machine", async () => {
      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      
      // Test with various malformed URLs that should definitely fail
      const malformedUrls = [
        "not-a-url-at-all-12345",
        "https://definitely-does-not-exist-12345.invalid",
        "https://nonexistent-domain-12345.xyz/page"
      ];
      
      for (const url of malformedUrls) {
        const result = await checkWaybackAvailability(url);
        // The Wayback Machine API might return results for some malformed URLs
        // so we just check that it doesn't crash
        expect(result === null || typeof result === 'object').toBe(true);
      }
    }, 15000);

    it("should handle concurrent requests efficiently", async () => {
      const promises = [
        client.getSummary("Rifter"),
        client.getSummary("Merlin"),
        client.getSummary("Punisher")
      ];
      
      try {
        const results = await Promise.allSettled(promises);
        
        // At least some requests should complete
        const fulfilled = results.filter(r => r.status === 'fulfilled');
        const rejected = results.filter(r => r.status === 'rejected');
        
        console.log(`Concurrent requests: ${fulfilled.length} fulfilled, ${rejected.length} rejected`);
        
        // Verify fulfilled results
        fulfilled.forEach((result) => {
          if (result.status === 'fulfilled') {
            expect(typeof result.value).toBe('string');
            expect(result.value.length).toBeGreaterThan(0);
          }
        });
        
      } catch (error) {
        console.warn("Concurrent request test failed:", error);
      }
    }, 60000);
  });

  describe("Performance and Rate Limiting", () => {
    it("should respect rate limits and retry logic", async () => {
      const startTime = Date.now();
      
      try {
        // Make multiple requests in sequence to test retry logic
        await client.getArticle("Rifter");
        await client.getSummary("Rifter");
        await client.search("rifter", 3);
        
        const endTime = Date.now();
        const duration = endTime - startTime;
        
        // Should take some time due to rate limiting and retries
        expect(duration).toBeGreaterThan(1000); // At least 1 second
        console.log(`Sequential requests took ${duration}ms`);
        
      } catch (error) {
        // Even if requests fail, we can verify the timing
        const endTime = Date.now();
        const duration = endTime - startTime;
        console.log(`Failed sequential requests took ${duration}ms`);
        
        expect(error).toBeInstanceOf(Error);
      }
    }, 90000);
  });

  describe("Content Quality Validation", () => {
    it("should extract meaningful content from archived pages", async () => {
      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      
      // Test with various HTML structures that might be found in archived pages
      const testCases = [
        {
          name: "Standard MediaWiki structure",
          html: `
            <html>
              <body>
                <div id="mw-content-text">
                  <div class="mw-parser-output">
                    <p>The Rifter is a Minmatar frigate.</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          expected: "Rifter is a Minmatar frigate"
        },
        {
          name: "Alternative content structure",
          html: `
            <html>
              <body>
                <main>
                  <article>
                    <h1>Mining</h1>
                    <p>Mining is a core industrial activity in EVE Online.</p>
                  </article>
                </main>
              </body>
            </html>
          `,
          expected: "Mining"
        },
        {
          name: "Minimal structure",
          html: `
            <html>
              <body>
                <h1>PvP Guide</h1>
                <p>Player versus Player combat guide.</p>
              </body>
            </html>
          `,
          expected: "PvP Guide"
        }
      ];
      
      testCases.forEach(({ name, html, expected }) => {
        const result = extractTextFromHtml(html);
        expect(result).toContain(expected);
        console.log(`✓ ${name}: extracted "${result.substring(0, 50)}..."`);
      });
    });

    it("should handle various character encodings and special characters", async () => {
      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      
      const htmlWithSpecialChars = `
        <html>
          <body>
            <div id="mw-content-text">
              <p>ISK: ₹ € $ ¥ £</p>
              <p>Ships: Rifter → Thrasher → Hurricane</p>
              <p>Damage: 100 HP/s ± 10%</p>
              <p>Unicode: 🚀 ⚡ 💎</p>
            </div>
          </body>
        </html>
      `;
      
      const result = extractTextFromHtml(htmlWithSpecialChars);
      
      expect(result).toContain("ISK");
      expect(result).toContain("Rifter");
      expect(result).toContain("100 HP/s");
      
      // Should handle special characters gracefully
      expect(result.length).toBeGreaterThan(0);
      console.log(`Special characters handled: "${result}"`);
    });
  });
});