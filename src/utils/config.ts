import fs from 'node:fs';
import path from 'node:path';

export interface ContextSlimConfig {
  mode: 'aggressive' | 'conservative';
  budget: {
    maxTokens: number;
  };
  ides: string[];
  limits: {
    catLines: number;
    grepMatches: number;
    treeDepth: number;
    maxLineWidth: number;
    outlineMaxSigsPerFile: number;
    dbSampleRows: number;
    dbMaxColumns: number;
    procsLimit: number;
    servicesLimit: number;
  };
  patterns: {
    alwaysInclude: string[];
    alwaysExclude: string[];
  };
}

export const DEFAULT_CONFIG: ContextSlimConfig = {
  mode: 'aggressive',
  budget: {
    maxTokens: 100000,
  },
  ides: ['antigravity', 'cursor', 'claude', 'copilot'],
  limits: {
    catLines: 150,
    grepMatches: 5,
    treeDepth: 3,
    maxLineWidth: 120,
    outlineMaxSigsPerFile: 15,
    dbSampleRows: 5,
    dbMaxColumns: 20,
    procsLimit: 30,
    servicesLimit: 30,
  },
  patterns: {
    alwaysInclude: [],
    alwaysExclude: [],
  },
};

const CONFIG_FILENAME = '.contextslimrc.json';

export class ConfigManager {
  /**
   * Loads the configuration from the current working directory.
   * If it doesn't exist, it returns the default configuration.
   */
  static loadConfig(): ContextSlimConfig {
    const configPath = path.join(process.cwd(), CONFIG_FILENAME);

    if (!fs.existsSync(configPath)) {
      return { ...DEFAULT_CONFIG };
    }

    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const userConfig = JSON.parse(fileContent);
      return this.mergeConfig(DEFAULT_CONFIG, userConfig);
    } catch (error) {
      console.warn(`[ContextSlim] Warning: Could not parse ${CONFIG_FILENAME}. Using defaults.`, error);
      return { ...DEFAULT_CONFIG };
    }
  }

  /**
   * Generates a default config file in the current working directory.
   */
  static generateDefaultConfig(): void {
    const configPath = path.join(process.cwd(), CONFIG_FILENAME);
    
    // Only generate if it doesn't already exist
    if (!fs.existsSync(configPath)) {
      fs.writeFileSync(
        configPath,
        JSON.stringify(DEFAULT_CONFIG, null, 2),
        'utf-8'
      );
    }
  }

  /**
   * Helper to perform a deep merge of the user config over the default config
   */
  private static mergeConfig(defaultConf: ContextSlimConfig, userConf: Partial<ContextSlimConfig>): ContextSlimConfig {
    return {
      ...defaultConf,
      ...userConf,
      budget: {
        ...defaultConf.budget,
        ...(userConf.budget || {}),
      },
      limits: {
        ...defaultConf.limits,
        ...(userConf.limits || {}),
      },
      patterns: {
        ...defaultConf.patterns,
        ...(userConf.patterns || {}),
      },
      ides: userConf.ides || defaultConf.ides,
    };
  }
}
