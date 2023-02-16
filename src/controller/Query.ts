import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
	ResultTooLargeError,
} from "./IInsightFacade";
import {
	QueryFilter,
	getKey,
	getValue
} from "./QueryFilter";

export class Query {
	public static perform(query: any, data: any[]): any[] {
		const qData: any[] = Body.perform(query, data);

		if (qData.length > 5000) {
			throw new ResultTooLargeError("Result length is larger than 5000, " +
				"the length is " + qData.length.toString());
		}
		return Options.perform(query, qData);
	}

	public static validate(query: any): string {
		if (!(Object.keys(query).length === 2 && "WHERE" in query && "OPTIONS" in query)) {
			throw new InsightError("Something wrong with WHERE and OPTIONS");
		}

		const ids = new Set<string>();
		Body.validate( {WHERE: query["WHERE"]}, ids );
		Options.validate(query["OPTIONS"], ids);

		if (ids.size === 1) {
			return Array.from(ids.values())[0];
		}
		throw new InsightError("Too many dataset ids");
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
			throw new ResultTooLargeError();
		}
		QueryFilter.validate(getValue(query), ids);
	}
}

class Options {
	public static perform(query: any, data: any[]): any[] {
		const columns = Columns.perform( {COLUMNS: query["OPTIONS"]["COLUMNS"]}, data );
		const keys: string[] = Object.keys(query);

		if (Object.keys(query["OPTIONS"]).includes("ORDER")) {
			return Order.perform(query, columns);
		} else {
			return columns;
		}
	}

	public static validate(query: any, ids: Set<any>): void {
		const keys: string[] = Object.keys(query);

		if (keys.length === 2 && keys.includes("COLUMNS") && keys.includes("ORDER")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]}, ids );
			Order.validate( {ORDER: query["ORDER"]}, query["COLUMNS"], ids );
		} else if (keys.length === 1 && keys.includes("COLUMNS")) {
			Columns.validate( {COLUMNS: query["COLUMNS"]}, ids );
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
				Key.isKey(key, new Set());		// Dummy placeholder
				const field = key.split("_")[1];
				result[key] = x[field];
			});
			return result;
		});
	}

	public static validate(query: any, ids: Set<string>): void {
		const val: string[] = getValue(query);
		const x = val.map((key) => {
			return Key.isKey(key, ids);
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
		const val = query["OPTIONS"]["ORDER"];
		return data.sort((a: any, b: any) => {
			const valA = a[val];
			const valB = b[val];

			if (typeof valA !== "number") {
				return valA.localeCompare(valB);
			}
			return valA - valB;
		});
	}

	public static validate(query: any, columnKeys: string[], ids: Set<string>): void {
		const key = getValue(query);
		ids.add((key.split("_")[0]));

		if (!(columnKeys.includes(key))) {
			throw new InsightError("Order error: " + JSON.stringify(query));
		}
	}
}

export class Key {
	public static isKey(key: string, ids: Set<string>): boolean {
		return this.isMKey(key, ids) || this.isSKey(key, ids);
	}

	private static isMKey(key: string, ids: Set<string>): boolean {
		const parts = key.split("_");

		if (parts.length !== 2) {
			throw new InsightError("Key error");
		}

		const sField = parts[1];

		if (!(["avg", "pass", "fail", "audit", "year"].includes(sField))) {
			return false;
		}
		ids.add(parts[0]);
		return true;
	}

	private static isSKey(key: string, ids: Set<string>): boolean {
		const parts = key.split("_");

		if (parts.length !== 2) {
			throw new InsightError("Key error");
		}

		const sField = parts[1];

		if (!(["dept", "id", "instructor", "title", "uuid"].includes(sField))) {
			return false;
		}
		ids.add(parts[0]);
		return true;
	}
}
