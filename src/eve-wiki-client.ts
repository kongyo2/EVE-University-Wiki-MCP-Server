import axios, { AxiosInstance } from "axios";
import * as cheerio from "cheerio";

export interface Article {
  content: string;
  pageid: number;
  revid: number;
  timestamp: string;
  title: string;
}

export interface SearchResult {
  pageid: number;
  snippet: string;
  timestamp: string;
  title: string;
  wordcount: number;
}

export interface Section {
  content?: string;
  index: number;
  level: number;
  title: string;
}

export class EveWikiClient {
  private baseUrl: string;
  private client: AxiosInstance;
  private maxRetries: number;
  private retryDelay: number;

  constructor(maxRetries: number = 3, retryDelay: number = 1000) {
    this.baseUrl = "https://wiki.eveuniversity.org/api.php";
    this.maxRetries = maxRetries;
    this.retryDelay = retryDelay;
    this.client = axios.create({
      baseURL: this.baseUrl,
      headers: {
        "User-Agent": "EVE-University-MCP-Server/1.0.0",
      },
      timeout: 30000,
    });
  }

  private async retryableRequest<T>(requestFn: () => Promise<T>): Promise<T> {
    let lastError: Error;

    for (let i = 0; i <= this.maxRetries; i++) {
      try {
        return await requestFn();
      } catch (error) {
        lastError = error as Error;
        
        // 最後のリトライでも失敗した場合、エラーをスロー
        if (i === this.maxRetries) {
          throw lastError;
        }
        
        // 次のリトライ前に遅延
        await new Promise(resolve => setTimeout(resolve, this.retryDelay * Math.pow(2, i)));
      }
    }
    throw lastError!;
  }

  /**
   * Get full article content
   */
  async getArticle(title: string): Promise<Article> {
    return this.retryableRequest(async () => {
      try {
        const response = await this.client.get("", {
          params: {
            action: "query",
            format: "json",
            prop: "revisions",
            rvprop: "content|timestamp|ids",
            rvslots: "main",
            titles: title,
          },
        });

        const pages = response.data?.query?.pages;
        if (!pages) {
          throw new Error("No pages found");
        }

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (page.missing) {
          throw new Error(`Article "${title}" not found`);
        }

        const revision = page.revisions?.[0];
        if (!revision) {
          throw new Error("No revision found");
        }

        return {
          content: revision.slots?.main?.["*"] || "",
          pageid: page.pageid,
          revid: revision.revid,
          timestamp: revision.timestamp,
          title: page.title,
        };
      } catch (error) {
        console.error("Error getting article:", error);
        throw new Error(`Failed to get article "${title}": ${error}`);
      }
    });
  }

  /**
   * Get links from an article
   */
  async getLinks(title: string): Promise<string[]> {
    return this.retryableRequest(async () => {
      try {
        const response = await this.client.get("", {
          params: {
            action: "query",
            format: "json",
            pllimit: 500,
            prop: "links",
            titles: title,
          },
        });

        const pages = response.data?.query?.pages;
        if (!pages) {
          return [];
        }

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (page.missing || !page.links) {
          return [];
        }

        return page.links.map((link: { title: string }) => link.title);
      } catch (error) {
        console.error("Error getting links:", error);
        throw new Error(`Failed to get links for "${title}": ${error}`);
      }
    });
  }

  /**
   * Get related topics based on categories
   */
  async getRelatedTopics(title: string, limit: number = 10): Promise<string[]> {
    return this.retryableRequest(async () => {
      try {
        // First get categories for the article
        const categoriesResponse = await this.client.get("", {
          params: {
            action: "query",
            cllimit: 10,
            format: "json",
            prop: "categories",
            titles: title,
          },
        });

        const pages = categoriesResponse.data?.query?.pages;
        if (!pages) {
          return [];
        }

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (page.missing || !page.categories) {
          return [];
        }

        // Get articles from the same categories
        const categories = page.categories.slice(0, 3); // Limit to first 3 categories
        const relatedArticles: Set<string> = new Set();

        for (const category of categories) {
          try {
            const categoryResponse = await this.client.get("", {
              params: {
                action: "query",
                cmlimit: 5,
                cmtitle: category.title,
                cmtype: "page",
                format: "json",
                list: "categorymembers",
              },
            });

            if (categoryResponse.data?.query?.categorymembers) {
              categoryResponse.data.query.categorymembers.forEach(
                (member: { title: string }) => {
                  if (member.title !== title && relatedArticles.size < limit) {
                    relatedArticles.add(member.title);
                  }
                },
              );
            }
          } catch (error) {
            console.warn(
              `Error getting category members for ${category.title}:`,
              error,
            );
          }
        }

        return Array.from(relatedArticles);
      } catch (error) {
        console.error("Error getting related topics:", error);
        throw new Error(`Failed to get related topics for "${title}": ${error}`);
      }
    });
  }

  /**
   * Get article sections
   */
  async getSections(title: string): Promise<Section[]> {
    return this.retryableRequest(async () => {
      try {
        const response = await this.client.get("", {
          params: {
            action: "parse",
            format: "json",
            page: title,
            prop: "sections",
          },
        });

        if (response.data?.parse?.sections) {
          return response.data.parse.sections.map(
            (section: { index: string; level: string; line: string }) => ({
              index: parseInt(section.index) || 0,
              level: parseInt(section.level) || 1,
              title: section.line,
            }),
          );
        }

        return [];
      } catch (error) {
        console.error("Error getting sections:", error);
        throw new Error(`Failed to get sections for "${title}": ${error}`);
      }
    });
  }

  /**
   * Get article summary (first paragraph)
   */
  async getSummary(title: string): Promise<string> {
    return this.retryableRequest(async () => {
      try {
        const response = await this.client.get("", {
          params: {
            action: "query",
            exintro: true,
            explaintext: true,
            exsectionformat: "plain",
            format: "json",
            prop: "extracts",
            titles: title,
          },
        });

        const pages = response.data?.query?.pages;
        if (!pages) {
          throw new Error("No pages found");
        }

        const pageId = Object.keys(pages)[0];
        const page = pages[pageId];

        if (page.missing) {
          throw new Error(`Article "${title}" not found`);
        }

        return page.extract || "No summary available";
      } catch (error) {
        console.error("Error getting summary:", error);
        throw new Error(`Failed to get summary for "${title}": ${error}`);
      }
    });
  }

  /**
   * Search for articles on EVE University Wiki
   */
  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    return this.retryableRequest(async () => {
      try {
        const response = await this.client.get("", {
          params: {
            action: "query",
            format: "json",
            list: "search",
            srlimit: limit,
            srprop: "snippet|titlesnippet|size|wordcount|timestamp",
            srsearch: query,
          },
        });

        if (response.data?.query?.search) {
          return response.data.query.search.map(
            (item: {
              pageid: number;
              snippet?: string;
              timestamp?: string;
              title: string;
              wordcount?: number;
            }) => ({
              pageid: item.pageid,
              snippet: this.cleanSnippet(item.snippet || ""),
              timestamp: item.timestamp || "",
              title: item.title,
              wordcount: item.wordcount || 0,
            }),
          );
        }

        return [];
      } catch (error) {
        console.error("Error searching EVE Wiki:", error);
        throw new Error(`Failed to search EVE Wiki: ${error}`);
      }
    });
  }

  /**
   * Clean HTML snippets from search results
   */
  private cleanSnippet(snippet: string): string {
    // Remove HTML tags and decode entities
    const $ = cheerio.load(snippet);
    return $.root().text().trim();
  }
}
