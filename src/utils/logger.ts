import chalk from "chalk";

class Logger {
	private static _instance: Logger;
	private prefixes = {
		debug: chalk.green("debug") + " -",
		info: chalk.cyan("info") + " -",
		warn: chalk.yellow("warn") + " -",
		error: chalk.red("error") + " -",
		event: chalk.magenta("event") + " -",
	};

	// eslint-disable-next-line @typescript-eslint/no-empty-function
	private constructor() {}

	static get Instance(): Logger {
		if (!Logger._instance) {
			Logger._instance = new Logger();
		}
		return this._instance;
	}

	public debug(...message: unknown[]) {
		console.log(this.prefixes.debug, ...message);
	}

	public info(...message: unknown[]) {
		console.log(this.prefixes.info, ...message);
	}

	public error(...message: unknown[]) {
		console.log(this.prefixes.error, ...message);
	}

	public warn(...message: unknown[]) {
		console.log(this.prefixes.warn, ...message);
	}

	public event(...message: unknown[]) {
		console.log(this.prefixes.event, ...message);
	}
}

export const Log = Logger.Instance;
