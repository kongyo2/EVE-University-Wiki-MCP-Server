# EVE University Wiki MCP Server

[![smithery badge](https://smithery.ai/badge/@kongyo2/eve-university-wiki-mcp-server)](https://smithery.ai/server/@kongyo2/eve-university-wiki-mcp-server)

A [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that provides access to EVE University Wiki content with automatic Wayback Machine fallback for enhanced reliability.

This server enables AI assistants to search, retrieve, and explore EVE Online knowledge from the comprehensive EVE University Wiki, making it an invaluable resource for EVE Online players, developers, and enthusiasts.

<a href="https://glama.ai/mcp/servers/@kongyo2/EVE-University-Wiki-MCP-Server">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/@kongyo2/EVE-University-Wiki-MCP-Server/badge" alt="EVE University Wiki Server MCP server" />
</a>

## Features

- **Comprehensive Search**: Search across all EVE University Wiki articles with intelligent result ranking
- **Full Article Access**: Retrieve complete article content with proper formatting
- **Article Summaries**: Get concise summaries for quick information overview
- **Section Navigation**: Browse article sections and structure
- **Link Discovery**: Find related articles through internal wiki links
- **Related Topics**: Discover related content based on article categories
- **Wayback Machine Fallback**: Automatic fallback to Internet Archive when primary wiki is unavailable
- **Robust Error Handling**: Graceful degradation with retry mechanisms
- **Rate Limiting**: Built-in request throttling to respect server resources

## Tools Available

### 1. `search_eve_wiki`
Search for articles on EVE University Wiki
- **Parameters**: 
  - `query` (string): Search query
  - `limit` (number, 1-50, default: 10): Maximum results to return
- **Returns**: Array of search results with titles, snippets, and metadata

### 2. `get_eve_wiki_article`
Retrieve full content of a specific wiki article
- **Parameters**: 
  - `title` (string): Article title
- **Returns**: Complete article content

### 3. `get_eve_wiki_summary`
Get a concise summary of an article
- **Parameters**: 
  - `title` (string): Article title
- **Returns**: Article summary/extract

### 4. `get_eve_wiki_sections`
List all sections within an article
- **Parameters**: 
  - `title` (string): Article title
- **Returns**: Array of sections with titles, levels, and indices

### 5. `get_eve_wiki_links`
Get all internal links from an article
- **Parameters**: 
  - `title` (string): Article title
- **Returns**: Array of linked article titles

### 6. `get_eve_wiki_related_topics`
Find related articles based on categories
- **Parameters**: 
  - `title` (string): Article title
  - `limit` (number, 1-20, default: 10): Maximum related topics to return
- **Returns**: Array of related article titles

## Resources

- **EVE University Wiki Info**: Basic information about the EVE University Wiki

## Prompts

- **eve-wiki-search-helper**: Generates optimized search queries for EVE University Wiki based on user questions

## Installation & Setup

### Installing via Smithery

To install eve-university-wiki-mcp-server for Claude Desktop automatically via [Smithery](https://smithery.ai/server/@kongyo2/eve-university-wiki-mcp-server):

```bash
npx -y @smithery/cli install @kongyo2/eve-university-wiki-mcp-server --client claude
```

### Prerequisites
- Node.js 18+ 
- npm or yarn

### Install Dependencies

```bash
npm install
```

### Development

Start the server in development mode with interactive CLI:

```bash
npm run dev
```

### Production

Build and start the server:

```bash
npm run build
npm run start
```

## Usage with MCP Clients

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "eve-university-wiki": {
      "command": "npx",
      "args": ["tsx", "/path/to/eve-university-mcp/src/server.ts"],
      "env": {}
    }
  }
}
```

### Other MCP Clients

The server uses stdio transport and follows the MCP specification, making it compatible with any MCP client.

## Example Usage

```typescript
// Search for EVE Online ships
await callTool("search_eve_wiki", { 
  query: "Rifter frigate", 
  limit: 5 
});

// Get detailed information about a specific ship
await callTool("get_eve_wiki_article", { 
  title: "Rifter" 
});

// Get a quick summary
await callTool("get_eve_wiki_summary", { 
  title: "Rifter" 
});

// Find related topics
await callTool("get_eve_wiki_related_topics", { 
  title: "Rifter", 
  limit: 10 
});
```

## Wayback Machine Fallback

When the primary EVE University Wiki is unavailable, the server automatically attempts to retrieve content from the Internet Archive's Wayback Machine. This ensures continued access to EVE Online knowledge even during wiki downtime.

Archived content is clearly marked in responses with:
- `source: "wayback_machine"` field
- `pageid: -1` to indicate archived content
- Descriptive notes about the content source

## Development

### Testing

Run the comprehensive test suite:

```bash
npm run test
```

The test suite covers:
- All tool functionality
- Error handling scenarios
- Parameter validation
- Response formatting
- Wayback Machine fallback

### Linting & Formatting

```bash
npm run lint    # Check code style
npm run format  # Fix formatting issues
```

### Code Quality

This project uses:
- [TypeScript](https://www.typescriptlang.org/) for type safety
- [ESLint](https://eslint.org/) for code quality
- [Prettier](https://prettier.io/) for consistent formatting
- [Vitest](https://vitest.dev/) for testing

## Architecture

The server is built with:
- **FastMCP**: High-performance MCP server framework
- **Axios**: HTTP client with retry logic and timeout handling
- **Cheerio**: HTML parsing for Wayback Machine content
- **Zod**: Runtime type validation for parameters

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes with tests
4. Run `npm run lint` and `npm run test`
5. Submit a pull request

## License

MIT License - see [LICENSE](LICENSE) file for details.

## Related Projects

- [FastMCP](https://github.com/punkpeye/fastmcp) - The MCP server framework used
- [Model Context Protocol](https://modelcontextprotocol.io/) - The protocol specification
- [EVE University Wiki](https://wiki.eveuniversity.org/) - The knowledge source