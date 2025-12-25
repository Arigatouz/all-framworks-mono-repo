[2025-12-25 16:38] - Updated by Junie - Error analysis
{
    "TYPE": "env/setup",
    "TOOL": "npx nx add @nx/angular",
    "ERROR": "Nx Angular plugin unsupported TypeScript setup with project references",
    "ROOT CAUSE": "The repo uses TypeScript project references, which Angular and @nx/angular do not support.",
    "PROJECT NOTE": "Check root tsconfig.json/tsconfig.base.json for \"references\" and \"composite\": true; remove or disable them before adding @nx/angular.",
    "NEW INSTRUCTION": "WHEN Nx reports unsupported TypeScript setup due to project references THEN remove references and composite from tsconfig before retrying"
}

