import {InsightError, ResultTooLargeError,} from "./IInsightFacade";
import {getKey, getValue, QueryFilter} from "./QueryFilter";
import {ApplyKey, Transformations} from "./QueryTransformations";

export class Query {
	public static perform(query: any, data: any[], id: string): any[] {
		let datasetData = Query.injectDatasetId(data, id);
		const qData: any[] = Body.perform(query, datasetData);

		if (qData.length > 5000) {
			throw new ResultTooLargeError("Result length is larger than 5000, " +
				"the length is " + qData.length.toString());
		}
		if ("TRANSFORMATIONS" in query) {
			const aData = Transformations.perform( {TRANSFORMATIONS: query["TRANSFORMATIONS"]}, qData );
			return Options.perform(query, aData);
		}
		return Options.perform(query, qData);
	}

	public static validate(query: any): string {
		const transInQuery: boolean = Object.keys(query).length === 3 && "WHERE" in query && "OPTIONS" in query
			&& "TRANSFORMATIONS" in query;
		const transNotInQuery: boolean = Object.keys(query).length === 2 && "WHERE" in query && "OPTIONS" in query;

		if (!(transInQuery || transNotInQuery)) {
			throw new InsightError("Something wrong with WHERE and OPTIONS");
		}

		const ids = new Set<string>();
		const applyKeys: string[] = [];

		if ("TRANSFORMATIONS" in query) {
			Transformations.validate(query["TRANSFORMATIONS"], ids, applyKeys);
			Transformations.validateOptionKeys(applyKeys.concat(query["TRANSFORMATIONS"]["GROUP"]), query["OPTIONS"]);
		}

		Options.validate(query["OPTIONS"], ids, applyKeys);
		this.validateNumIds(ids);
		Body.validate( {WHERE: query["WHERE"]}, ids );
		this.validateNumIds(ids);
		return Array.from(ids.values())[0];
	}

	private static validateNumIds(ids: Set<string>) {
		if (ids.size > 1) {
			throw new InsightError("Too many dataset ids");
		}
	}

	private static injectDatasetId(data: any[], id: string) {
		return data.map((d) => {
			const newD: any = {};
			Object.keys(d).forEach((field) => {
				newD[id + "_" + field] = d[field];
			});
			return newD;
		});
	}
}

class Body {
	public static perform(query: any, data: any[]): any[] {
		return QueryFilter.perform(query["WHERE"], data);
	}

	public static validate(query: any, ids: Set<any>): void {
		const key = getKey(query);

		if (key !== "WHERE") {
			throw new InsightError("Body error: " + JSON.stringify(query));
		}
		if (Object.keys(query[key]).length === 0) {
			return;
		}
		QueryFilter.validate(getValue(query), ids);
	}
}

class Options {
	public static perform(query: any, data: any[]): any[] {
		const columns = Columns.perform( {COLUMNS: query["OPTIONS"]["COLUMNS"]}, data );

		if (Object.keys(query["OPTIONS"]).includes("ORDER")) {
			return Order.perform(query, columns);
		} else {
			return columns;
		}
	}

	public static validate(query: any, ids: Set<any>, applyKeys: string[]): void {
		const keys: string[] = Object.keys(query);

		if (keys.length === 2 && keys.includes("COLUMNS") && keys.includes("ORDER")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]}, ids, applyKeys );
			Order.validate( {ORDER: query["ORDER"]}, query["COLUMNS"], ids, applyKeys );
		} else if (keys.length === 1 && keys.includes("COLUMNS")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]}, ids , applyKeys);
		} else {
			throw new InsightError("Options error: " + JSON.stringify(query));
		}
	}
}

class Columns {
	public static perform(query: any, data: any[]): any[] {
		const val: string[] = getValue(query);
		return data.map((x: any) => {
			const result: any = {};
			val.forEach((key) => {
				result[key] = x[key];
			});
			return result;
		});
	}

	public static validate(query: any, ids: Set<string>, applyKeys: string[]): void {
		const val: string[] = getValue(query);
		const x = val.map((key) => {
			return Key.isKey(key, ids) || ApplyKey.isApplyKey(key, applyKeys);
		}).every((v) => {
			return v;
		});

		if (!x) {
			throw new InsightError("Columns error: " + JSON.stringify(query));
		}
	}
}

class Order {
	public static perform(query: any, data: any[]): any[] {
		return data.sort((a: any, b: any) => {
			let {dir, keys} = Order.getDirAndKeys(query);

			while (keys.length > 0) {
				const key: string | undefined = keys.shift();
				if (!key) {
					return  0;
				}

				const valA = a[key];
				const valB = b[key];
				if (typeof valA !== "number") {
					if (valA < valB || valB < valA) {
						const isALessThanB = (valA < valB) ? -1 : 1;
						return (dir === "UP") ? isALessThanB : -1 * isALessThanB;
					}
				}
				if ((valA - valB) !== 0) {
					return (dir === "UP") ? valA - valB : -1 * (valA - valB);
				}
			}
			return 0;
		});
	}

	public static validate(query: any, columnKeys: string[], ids: Set<string>, applyKeys: string[]): void {
		const sortValue = getValue(query);

		if (typeof sortValue === "string") {
			if (!applyKeys.includes(sortValue)) {
				if(!sortValue.includes("_")){
					throw new InsightError("Sort key is not apply key and does not have underscore");
				}
				ids.add((sortValue.split("_")[0]));
			}

			if (!(columnKeys.includes(sortValue) || ApplyKey.isApplyKey(sortValue, applyKeys))) {
				throw new InsightError("ORDER error: " + JSON.stringify(query));
			}
		} else {
			const keys = Object.keys(sortValue);
			if (!(keys.length === 2 && keys.includes("dir") && keys.includes("keys"))) {
				throw new InsightError("ORDER has wrong format");
			}

			const dir = sortValue["dir"];
			if (!["UP", "DOWN"].includes(dir)) {
				throw new InsightError("DIR has wrong format");
			}

			const anyKeys = sortValue["keys"];
			if (!(Array.isArray(anyKeys) && anyKeys.length > 0)) {
				throw new InsightError("Sort anyKey list is not an array or is empty");
			}

			const bool: boolean = anyKeys.every((key: string) => {
				return columnKeys.includes(key) || ApplyKey.isApplyKey(key, applyKeys);
			});
			if (!bool) {
				throw new InsightError("ORDER key error");
			}
		}
	}

	private static getDirAndKeys(query: any) {
		let val = query["OPTIONS"]["ORDER"];
		let dir = "UP";
		let keys: string[] = [];

		if (typeof val !== "string") {
			dir = val["dir"];
			keys = keys.concat(val["keys"]);
		} else {
			keys.push(val);
		}
		return {dir, keys};
	}
}

export class Key {
	public static isKey(key: string, ids: Set<string>): boolean {
		return this.isMKey(key, ids) || this.isSKey(key, ids);
	}

	public static isMKey(key: string, ids: Set<string>): boolean {
		const parts = key.split("_");

		if (parts.length !== 2) {
			return false;
		}

		const sField = parts[1];
		const sectionFields = ["avg", "pass", "fail", "audit", "year"];
		const roomFields = ["lat", "lon", "seats"];

		if (!(sectionFields.concat(roomFields).includes(sField))) {
			return false;
		}

		ids.add(parts[0]);
		return true;
	}

	public static isSKey(key: string, ids: Set<string>): boolean {
		const parts = key.split("_");

		if (parts.length !== 2) {
			return false;
		}

		const sField = parts[1];
		const sectionFields = ["dept", "id", "instructor", "title", "uuid"];
		const roomFields = ["fullname", "shortname", "number", "name", "address", "type", "furniture", "href"];

		if (!(sectionFields.concat(roomFields).includes(sField))) {
			return false;
		}

		ids.add(parts[0]);
		return true;
	}
}
