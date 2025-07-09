import { MCPClient } from "@mastra/mcp";
import { outputDir } from "./const";

export const mcp = new MCPClient({
  servers: {
    filesystem: {
      command: "npx",
      args: [
        "-y",
        "@modelcontextprotocol/server-filesystem",
        outputDir,
      ],
    },
    playwright: {
        command: "npx",
        args: [
            "@playwright/mcp@latest",
            "--output-dir",
            outputDir,
        ],
    },
    // bravesearch: {
    //   "command": "npx",
    //   "args": [
    //     "-y",
    //     "@modelcontextprotocol/server-brave-search"
    //   ],
    //   "env": {
    //     "BRAVE_API_KEY": braveSearchApiKey
    //   }
    // },
    // fetch: {
    //   "command": "uvx",
    //   "args": ["mcp-server-fetch"]
    // },
    marpmcpnode: {
        command: "npx",
        args: ["-y", "@dannadori/marp-mcp-node@1.0.7"],
    }
  },
});
