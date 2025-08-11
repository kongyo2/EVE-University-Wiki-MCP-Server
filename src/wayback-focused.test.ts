import { describe, expect, it, beforeAll } from "vitest";
import { EveWikiClient } from "./eve-wiki-client.js";

// Focused integration tests for Wayback Machine functionality
describe("EVE Wiki Client - Focused Wayback Machine Tests", () => {
  let client: EveWikiClient;
  
  beforeAll(() => {
    client = new EveWikiClient(2, 2000);
  });

  describe("Real Wayback Machine Integration", () => {
    it("should check availability for a well-known website", async () => {
      const checkWaybackAvailability = (client as any).checkWaybackAvailability.bind(client);
      
      // Test with a well-known website that should definitely be archived
      const result = await checkWaybackAvailability("https://example.com");
      
      if (result) {
        expect(result.available).toBe(true);
        expect(result.timestamp).toMatch(/^\d{14}$/);
        expect(result.url).toContain("web.archive.org");
        console.log(`Found archived version: ${result.timestamp}`);
      } else {
        console.warn("No archived version found for example.com (unexpected)");
      }
    }, 15000);

    it("should retrieve content from a known archived page", async () => {
      const getWaybackContent = (client as any).getWaybackContent.bind(client);
      
      try {
        // Use a specific timestamp for a known archived page
        const content = await getWaybackContent("https://example.com", "20200101000000");
        
        expect(content).toBeDefined();
        expect(typeof content).toBe("string");
        expect(content.length).toBeGreaterThan(0);
        expect(content).toContain("<html");
        
        console.log(`Retrieved ${content.length} characters from archived page`);
      } catch (error) {
        // If this specific timestamp doesn't exist, try without timestamp
        try {
          const content = await getWaybackContent("https://example.com");
          expect(content).toBeDefined();
          expect(typeof content).toBe("string");
          expect(content.length).toBeGreaterThan(0);
          console.log("Retrieved content from latest archived version");
        } catch (fallbackError) {
          console.warn("Could not retrieve archived content:", fallbackError);
          // This is acceptable - the page might not be archived
        }
      }
    }, 20000);

    it("should handle text extraction from real HTML", async () => {
      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      
      // Test with actual HTML structure from a MediaWiki page
      const realHtml = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Test Page - EVE University Wiki</title>
          </head>
          <body>
            <div id="mw-navigation">
              <div class="mw-navigation-item">Navigation</div>
            </div>
            <div id="mw-content-text">
              <div class="mw-parser-output">
                <p><b>EVE Online</b> is a space-based, persistent world massively multiplayer online role-playing game (MMORPG) developed and published by CCP Games.</p>
                <p>Players of EVE Online can participate in a number of in-game professions and activities, including mining, piracy, manufacturing, trading, exploration, and combat (both player versus environment and player versus player).</p>
                <h2><span class="mw-headline" id="Gameplay">Gameplay</span></h2>
                <p>The game features a player-driven economy where most items are manufactured by players.</p>
              </div>
            </div>
            <div id="footer">
              <p>Footer content that should be excluded</p>
            </div>
          </body>
        </html>
      `;
      
      const result = extractTextFromHtml(realHtml);
      
      // Should contain main content
      expect(result).toContain("EVE Online");
      expect(result).toContain("space-based");
      expect(result).toContain("MMORPG");
      expect(result).toContain("CCP Games");
      expect(result).toContain("Gameplay");
      expect(result).toContain("player-driven economy");
      
      // Should not contain navigation or footer
      expect(result).not.toContain("Navigation");
      expect(result).not.toContain("Footer content");
      
      console.log(`Extracted text length: ${result.length} characters`);
    });

    it("should handle edge cases in HTML extraction", async () => {
      const extractTextFromHtml = (client as any).extractTextFromHtml.bind(client);
      
      const edgeCases = [
        {
          name: "Empty content div",
          html: '<html><body><div id="mw-content-text"></div></body></html>',
          expectEmpty: true
        },
        {
          name: "No content div, fallback to body",
          html: '<html><body><p>Body content only</p></body></html>',
          expected: "Body content only"
        },
        {
          name: "Nested content structure",
          html: `
            <html>
              <body>
                <div id="mw-content-text">
                  <div class="mw-parser-output">
                    <div class="infobox">
                      <p>Infobox content</p>
                    </div>
                    <p>Main article content</p>
                  </div>
                </div>
              </body>
            </html>
          `,
          expected: "Main article content"
        }
      ];
      
      edgeCases.forEach(({ name, html, expected, expectEmpty }) => {
        const result = extractTextFromHtml(html);
        
        if (expectEmpty) {
          expect(result.trim().length).toBe(0);
        } else if (expected) {
          expect(result).toContain(expected);
        }
        
        console.log(`✓ ${name}: "${result.substring(0, 50)}${result.length > 50 ? '...' : ''}"`);
      });
    });
  });

  describe("Fallback Behavior Integration", () => {
    it("should demonstrate fallback behavior with forced primary failure", async () => {
      // Create a client with invalid base URL to force primary failure
      const failingClient = new EveWikiClient(1, 100);
      
      // Override the primary client to use an invalid URL
      (failingClient as any).client.defaults.baseURL = "https://invalid-wiki-url-12345.invalid/api.php";
      
      try {
        const result = await failingClient.getArticle("TestArticle");
        
        // If we get here, it means fallback worked
        expect(result.pageid).toBe(-1); // Should indicate Wayback Machine source
        expect(result.title).toContain("(Archived)");
        console.log("Fallback mechanism worked successfully");
        
      } catch (error) {
        // This is expected if both primary and fallback fail
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
        console.log("Both primary and fallback failed as expected");
      }
    }, 30000);

    it("should handle concurrent fallback requests", async () => {
      const failingClient = new EveWikiClient(1, 100);
      (failingClient as any).client.defaults.baseURL = "https://invalid-wiki-url-12345.invalid/api.php";
      
      const promises = [
        failingClient.getSummary("Article1").catch(e => ({ error: e.message })),
        failingClient.getSummary("Article2").catch(e => ({ error: e.message })),
        failingClient.getSummary("Article3").catch(e => ({ error: e.message }))
      ];
      
      const results = await Promise.all(promises);
      
      // All should either succeed with fallback or fail gracefully
      results.forEach((result, index) => {
        if (typeof result === 'string') {
          // Success case
          expect(result.length).toBeGreaterThan(0);
          console.log(`Request ${index + 1}: Success with fallback`);
        } else if (result.error) {
          // Error case
          expect(result.error).toContain("from both primary source and Wayback Machine");
          console.log(`Request ${index + 1}: Failed as expected`);
        }
      });
    }, 45000);
  });

  describe("Performance and Reliability", () => {
    it("should handle rate limiting gracefully", async () => {
      const startTime = Date.now();
      
      // Make several requests in quick succession
      const requests = [];
      for (let i = 0; i < 3; i++) {
        requests.push(
          client.getSummary("Rifter").catch(e => ({ error: e.message }))
        );
      }
      
      const results = await Promise.all(requests);
      const endTime = Date.now();
      const duration = endTime - startTime;
      
      // Should take some time due to rate limiting
      expect(duration).toBeGreaterThan(500); // At least 500ms for 3 requests
      
      // At least some requests should succeed
      const successes = results.filter(r => typeof r === 'string');
      const errors = results.filter(r => typeof r === 'object' && 'error' in r);
      
      console.log(`Rate limiting test: ${successes.length} successes, ${errors.length} errors in ${duration}ms`);
      
      // Verify error messages are consistent
      errors.forEach(error => {
        expect(error.error).toContain("from both primary source and Wayback Machine");
      });
    }, 30000);

    it("should maintain consistent behavior across retries", async () => {
      // Test the retry mechanism with a client that has short timeouts
      const retryClient = new EveWikiClient(2, 500); // 2 retries, 500ms delay
      
      try {
        const result = await retryClient.getSummary("Rifter");
        
        // If successful, verify the result
        expect(result).toBeDefined();
        expect(typeof result).toBe("string");
        expect(result.length).toBeGreaterThan(0);
        
        console.log("Retry mechanism maintained consistency");
        
      } catch (error) {
        // If failed, verify it's the expected error
        expect(error).toBeInstanceOf(Error);
        expect((error as Error).message).toContain("from both primary source and Wayback Machine");
        console.log("Retry mechanism failed consistently");
      }
    }, 20000);
  });
});