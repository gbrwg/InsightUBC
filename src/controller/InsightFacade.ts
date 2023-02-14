import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

import fs, {readJSONSync} from "fs-extra";
import Helper from "./Helper";
import {Query} from "./Query";


/**
 * This is the main programmatic entry point for the project.
 * Method documentation is in IInsightFacade
 *
 */
export default class InsightFacade implements IInsightFacade {
	private helper: Helper;
	private datasets: Map<string, any>;
	constructor() {
		this.helper = new Helper();
		this.datasets = new Map<string, any[]>();
		console.log("InsightFacadeImpl::init()");
	}

	public addDataset(id: string, content: string, kind: InsightDatasetKind): Promise<string[]> {

		return new Promise<string[]>((resolve, reject) => {
			// !id.trim() from https://stackoverflow.com/questions/10261986/how-to-detect-string-which-contains-only-spaces
			if (kind !== "sections" || id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			}
			// check duplicate
			if (this.datasets.has(id)) {
				reject(new InsightError("Cannot add existing ID"));
			}
			// parse file

			this.helper.processData(content)
				.then((result) => {
					this.writeToDisk(id, result);
					this.datasets.set(id, result);
					resolve(Array.from(this.datasets.keys()));
				})
				.catch(() => {
					reject(new InsightError());
				});
		});
	}

	private writeToDisk(id: string, result: string[]) {
		let path = "./data";
		fs.ensureDir(path)
			.then(() => {
				return fs.writeJsonSync("./data/" + id + ".json", result);
			})
			.catch((err) => {
				console.error(err);
			});
	}

	private readFromDisk() {
		let path = "./data";
		fs.ensureDir(path)
			.then(() => {
				return fs.readJSONSync(path);
			})
			.catch((err) => {
				console.error(err);
			});
	}

	public removeDataset(id: string): Promise<string> {

		return new Promise<string>((resolve, reject) => {
			if (id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			} else if (!this.datasets.has(id)) {
				reject(new NotFoundError("Cannot delete non-existent ID"));
			} else {
				this.datasets.delete(id);
				resolve(id);
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		// Need dataset

		// eslint-disable-next-line @typescript-eslint/no-require-imports
		const data = require("../controller/courses.json");

		return new Promise((resolve, reject) => {
			try {
				Query.validate(query);
				const result = Query.perform(query, data["data"]);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		});
		// return Promise.reject("Not implemented.");
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return Promise.reject("Not implemented.");
	}
}
