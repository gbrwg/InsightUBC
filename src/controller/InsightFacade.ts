import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

import fs from "fs-extra";
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
		this.readFromDisk();
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
					if (result.length === 0) {
						reject(new InsightError("invalid dataset"));
					}
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
				return fs.writeJsonSync("./data " + id + ".json", result);
			})
			.catch((err) => {
				console.error(err);
			});
	}

	private readFromDisk(){
		let path = "./data";
		fs.readdir(path, (err, files) => {
			if (err) {
				return;
			} else {
				files.forEach((file) => {
					const id = file.split(".")[0];
					const data = fs.readJsonSync(path + "/" + file);
					this.datasets.set(id, data);
				});
			}
		});


	}

	public removeDataset(id: string): Promise<string> {

		return new Promise<string>((resolve, reject) => {
			if (id === "" || id.includes("_") || !id.trim()) {
				reject(new InsightError("invalid ID"));
			} else if (!this.datasets.has(id)) {
				reject(new NotFoundError());
			} else {
				this.datasets.delete(id);
				fs.removeSync("./data " + id + ".json");
				resolve(id);
			}
		});
	}

	public performQuery(query: unknown): Promise<InsightResult[]> {
		return new Promise((resolve, reject) => {
			try {
				const id: string = Query.validate(query);
				const data = this.datasets.get(id);
				const result = Query.perform(query, data);
				resolve(result);
			} catch (error) {
				reject(error);
			}
		});
	}

	public listDatasets(): Promise<InsightDataset[]> {
		return new Promise((resolve) => {
			const InsightDatasets: InsightDataset[] = [];
			this.datasets.forEach((value: any[], key: string) => {
				InsightDatasets.push({id: key, kind: InsightDatasetKind.Sections, numRows: value.length});
			});
			resolve(InsightDatasets);
		});
	}
}
