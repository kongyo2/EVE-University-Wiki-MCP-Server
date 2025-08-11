import { FastMCP } from "fastmcp";
import { z } from "zod";

import { EveWikiClient } from "./eve-wiki-client.js";

const server = new FastMCP({
  name: "EVE University Wiki",
  version: "1.0.0",
});

// Initialize EVE Wiki client
const eveWikiClient = new EveWikiClient();

// Search EVE University Wiki
server.addTool({
  annotations: {
    openWorldHint: true, // This tool interacts with external systems
    readOnlyHint: true, // This tool doesn't modify anything
    title: "Search EVE University Wiki",
  },
  description: "Search for articles on EVE University Wiki",
  execute: async (args) => {
    try {
      const results = await eveWikiClient.search(args.query, args.limit);
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
  },
  name: "search_eve_wiki",
  parameters: z.object({
    limit: z
      .number()
      .min(1)
      .max(50)
      .default(10)
      .describe("Maximum number of results to return"),
    query: z.string().describe("Search query for EVE University Wiki"),
  }),
});

// Get EVE University Wiki article
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Get EVE University Wiki Article",
  },
  description: "Get the full content of an EVE University Wiki article",
  execute: async (args) => {
    try {
      const article = await eveWikiClient.getArticle(args.title);
      return JSON.stringify(
        {
          content: article.content.substring(0, 10000), // Limit content length
          pageid: article.pageid,
          timestamp: article.timestamp,
          title: article.title,
        },
        null,
        2,
      );
    } catch (error) {
      return `Error getting article: ${error}`;
    }
  },
  name: "get_eve_wiki_article",
  parameters: z.object({
    title: z.string().describe("Title of the EVE University Wiki article"),
  }),
});

// Get EVE University Wiki article summary
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Get EVE University Wiki Summary",
  },
  description: "Get a summary of an EVE University Wiki article",
  execute: async (args) => {
    try {
      const summary = await eveWikiClient.getSummary(args.title);
      return JSON.stringify(
        {
          summary: summary,
          title: args.title,
        },
        null,
        2,
      );
    } catch (error) {
      return `Error getting summary: ${error}`;
    }
  },
  name: "get_eve_wiki_summary",
  parameters: z.object({
    title: z.string().describe("Title of the EVE University Wiki article"),
  }),
});

// Get EVE University Wiki article sections
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Get EVE University Wiki Sections",
  },
  description: "Get the sections of an EVE University Wiki article",
  execute: async (args) => {
    try {
      const sections = await eveWikiClient.getSections(args.title);
      return JSON.stringify(
        {
          sections: sections,
          title: args.title,
        },
        null,
        2,
      );
    } catch (error) {
      return `Error getting sections: ${error}`;
    }
  },
  name: "get_eve_wiki_sections",
  parameters: z.object({
    title: z.string().describe("Title of the EVE University Wiki article"),
  }),
});

// Get EVE University Wiki article links
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Get EVE University Wiki Links",
  },
  description: "Get the links contained within an EVE University Wiki article",
  execute: async (args) => {
    try {
      const links = await eveWikiClient.getLinks(args.title);
      return JSON.stringify(
        {
          links: links.slice(0, 100), // Limit to first 100 links
          title: args.title,
        },
        null,
        2,
      );
    } catch (error) {
      return `Error getting links: ${error}`;
    }
  },
  name: "get_eve_wiki_links",
  parameters: z.object({
    title: z.string().describe("Title of the EVE University Wiki article"),
  }),
});

// Get related topics from EVE University Wiki
server.addTool({
  annotations: {
    openWorldHint: true,
    readOnlyHint: true,
    title: "Get Related EVE University Wiki Topics",
  },
  description:
    "Get topics related to an EVE University Wiki article based on categories",
  execute: async (args) => {
    try {
      const relatedTopics = await eveWikiClient.getRelatedTopics(
        args.title,
        args.limit,
      );
      return JSON.stringify(
        {
          related_topics: relatedTopics,
          title: args.title,
        },
        null,
        2,
      );
    } catch (error) {
      return `Error getting related topics: ${error}`;
    }
  },
  name: "get_eve_wiki_related_topics",
  parameters: z.object({
    limit: z
      .number()
      .min(1)
      .max(20)
      .default(10)
      .describe("Maximum number of related topics to return"),
    title: z.string().describe("Title of the EVE University Wiki article"),
  }),
});

// Add resources for common EVE University Wiki pages
server.addResource({
  async load() {
    return {
      text: "EVE University Wiki - The comprehensive resource for EVE Online knowledge and learning",
    };
  },
  mimeType: "text/plain",
  name: "EVE University Wiki Info",
  uri: "https://wiki.eveuniversity.org/",
});

// Add prompt for EVE-related questions
server.addPrompt({
  arguments: [
    {
      description: "Your question about EVE Online",
      name: "question",
      required: true,
    },
  ],
  description:
    "Generate a search query for EVE University Wiki based on your question",
  load: async (args) => {
    return `Based on this EVE Online question: "${args.question}"

Generate an appropriate search query for EVE University Wiki to find relevant information. Consider:
- EVE Online game mechanics
- Ships, modules, and equipment
- Trading and industry
- PvP and PvE strategies
- Corporation and alliance management
- Game lore and background

Search query:`;
  },
  name: "eve-wiki-search-helper",
});

server.start({
  transportType: "stdio",
});
