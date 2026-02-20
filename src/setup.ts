import * as readline from "node:readline";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { basicAuthHeader } from "./client/auth.js";

const PACKAGE_NAME = "@wpgaurav/wp-mcp";

interface SetupAnswers {
  wpUrl: string;
  wpUsername: string;
  wpAppPassword: string;
  maxTools: string;
}

function createPrompt(): (question: string) => Promise<string> {
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return (question: string) =>
    new Promise((resolve) => rl.question(question, (answer) => resolve(answer.trim())));
}

async function ask(prompt: (q: string) => Promise<string>, question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await prompt(`${question}${suffix}: `);
  return answer || defaultValue || "";
}

async function testConnection(url: string, username: string, password: string): Promise<boolean> {
  const baseUrl = `${url.replace(/\/+$/, "")}/wp-json/wp/v2/users/me`;
  try {
    const response = await fetch(baseUrl, {
      headers: { Authorization: basicAuthHeader(username, password) },
    });
    if (response.ok) {
      const user = (await response.json()) as { name?: string; slug?: string };
      console.log(`\n  Connected as: ${user.name ?? user.slug ?? "unknown"}`);
      return true;
    }
    const body = (await response.json()) as { message?: string };
    console.error(`\n  Connection failed (${response.status}): ${body.message ?? response.statusText}`);
    return false;
  } catch (err) {
    console.error(`\n  Connection failed: ${(err as Error).message}`);
    return false;
  }
}

function getClaudeDesktopConfigPath(): string {
  const platform = os.platform();
  if (platform === "darwin") {
    return path.join(os.homedir(), "Library", "Application Support", "Claude", "claude_desktop_config.json");
  }
  if (platform === "win32") {
    return path.join(os.homedir(), "AppData", "Roaming", "Claude", "claude_desktop_config.json");
  }
  return path.join(os.homedir(), ".config", "claude", "claude_desktop_config.json");
}

function getClaudeCodeConfigPath(): string {
  return path.join(os.homedir(), ".claude", "settings.json");
}

function writeToConfig(configPath: string, answers: SetupAnswers): boolean {
  let config: Record<string, unknown> = {};

  if (fs.existsSync(configPath)) {
    try {
      config = JSON.parse(fs.readFileSync(configPath, "utf-8")) as Record<string, unknown>;
    } catch {
      console.error(`  Warning: Could not parse existing ${configPath}, creating new file.`);
    }
  }

  const dir = path.dirname(configPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  const mcpServers = (config["mcpServers"] ?? {}) as Record<string, unknown>;
  const env: Record<string, string> = {
    WP_URL: answers.wpUrl,
    WP_USERNAME: answers.wpUsername,
    WP_APP_PASSWORD: answers.wpAppPassword,
  };
  if (answers.maxTools && answers.maxTools !== "128") {
    env["WP_MCP_MAX_TOOLS"] = answers.maxTools;
  }
  mcpServers["wordpress"] = {
    command: "npx",
    args: [PACKAGE_NAME],
    env,
  };
  config["mcpServers"] = mcpServers;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
  return true;
}

export async function runSetup(): Promise<void> {
  const prompt = createPrompt();

  console.log(`
┌─────────────────────────────────────┐
│  wp-mcp Setup                       │
│  WordPress MCP Server               │
└─────────────────────────────────────┘

This will connect your WordPress site to Claude.

Prerequisites:
  1. Your WordPress site URL
  2. A WordPress admin username
  3. An Application Password
     (WordPress Admin > Users > Profile > Application Passwords)
`);

  const wpUrl = await ask(prompt, "WordPress site URL (e.g. https://example.com)");
  if (!wpUrl) {
    console.error("URL is required.");
    process.exit(1);
  }

  const wpUsername = await ask(prompt, "WordPress username");
  if (!wpUsername) {
    console.error("Username is required.");
    process.exit(1);
  }

  const wpAppPassword = await ask(prompt, "Application Password");
  if (!wpAppPassword) {
    console.error("Application Password is required.");
    process.exit(1);
  }

  const cleanUrl = wpUrl.replace(/\/+$/, "");

  console.log("\n  Testing connection...");
  const connected = await testConnection(cleanUrl, wpUsername, wpAppPassword);

  if (!connected) {
    const proceed = await ask(prompt, "\n  Connection failed. Save config anyway? (y/n)", "n");
    if (proceed.toLowerCase() !== "y") {
      console.log("\n  Setup cancelled.");
      process.exit(1);
    }
  }

  console.log(`
Max tools controls how many tools are exposed to Claude.
More tools = more context used per message.

  37  = Core WordPress tools only (recommended for most sites)
  50  = Core + a few plugin endpoints
  128 = Core + all discovered plugin endpoints (default, uses most context)
`);

  const maxTools = await ask(prompt, "Max tools", "50");

  const answers: SetupAnswers = { wpUrl: cleanUrl, wpUsername, wpAppPassword, maxTools };

  console.log(`
Where do you want to use wp-mcp?

  1. Claude Desktop
  2. Claude Code
  3. Both
  4. Just print the config (I'll add it myself)
`);

  const target = await ask(prompt, "Choose (1-4)", "3");

  if (target === "1" || target === "3") {
    const configPath = getClaudeDesktopConfigPath();
    writeToConfig(configPath, answers);
    console.log(`\n  Written to: ${configPath}`);
  }

  if (target === "2" || target === "3") {
    const configPath = getClaudeCodeConfigPath();
    writeToConfig(configPath, answers);
    console.log(`\n  Written to: ${configPath}`);
  }

  if (target === "4") {
    const printEnv: Record<string, string> = {
      WP_URL: answers.wpUrl,
      WP_USERNAME: answers.wpUsername,
      WP_APP_PASSWORD: answers.wpAppPassword,
    };
    if (answers.maxTools && answers.maxTools !== "128") {
      printEnv["WP_MCP_MAX_TOOLS"] = answers.maxTools;
    }
    const config = {
      mcpServers: {
        wordpress: {
          command: "npx",
          args: [PACKAGE_NAME],
          env: printEnv,
        },
      },
    };
    console.log("\n  Add this to your config:\n");
    console.log(JSON.stringify(config, null, 2));
  }

  console.log(`
  Done! Restart Claude Desktop/Code to start using WordPress tools.
`);

  process.exit(0);
}
