import { GitHub } from "arctic";
import { getEnv } from "@/utils/env";

const githubClientId = getEnv("GITHUB_CLIENT_ID");
const githubClientSecret = getEnv("GITHUB_CLIENT_SECRET");
const githubRedirectUri = getEnv("GITHUB_REDIRECT_URI") ||
	"http://localhost:8787/login/github/callback";

if (!githubClientId || !githubClientSecret) {
	throw new Error("GitHub OAuth environment variables are not configured");
}

// GitHub OAuth client using environment variables from Cloudflare
export const github = new GitHub(
	githubClientId,
	githubClientSecret,
	githubRedirectUri,
);
