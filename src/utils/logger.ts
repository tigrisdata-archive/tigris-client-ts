import chalk from "chalk";

class Logger {
	private prefixes = {
		debug: chalk.green("debug") + " -",
		info: chalk.cyan("info") + " -",
		warn: chalk.yellow("warn") + " -",
		error: chalk.red("error") + " -",
		event: chalk.magenta("event") + " -",
	};

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

export const Log = new Logger();
