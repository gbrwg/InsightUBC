import {
	IInsightFacade,
	InsightDataset,
	InsightDatasetKind,
	InsightError,
	InsightResult,
	NotFoundError,
} from "./IInsightFacade";

export function getKey(query: any): string {
	const keys = Object.keys(query);

	if (keys.length > 1) {
		throw new InsightError("More than one key in the query: " + JSON.stringify(query));
	}
	return keys[0];
}

export function getValue(query: any): any {
	const key = getKey(query);
	return query[key];
}

export class QueryFilter {
	public static perform(query: any, data: any[]): any[] {
		const key = getKey(query);

		if (["AND", "OR"].includes(key)) {
			return LogicComparison.perform(query, data);
		}
		if (["LT", "GT", "EQ"].includes(key)) {
			return MComparison.perform(query, data);
		}
		if (["IS"].includes(key)) {
			return SComparison.perform(query, data);
		}
		if (["NOT"].includes(key)) {
			return Negation.perform(query, data);
		}
		throw new InsightError("Filter error: " + JSON.stringify(query));
	}

	public static validate(query: any): void {
		const key = getKey(query);

		if (!(["AND", "OR", "LT", "GT", "EQ", "IS", "NOT"].includes(key))) {
			throw new InsightError("Body error: " + JSON.stringify(query));
		}
		if (["AND", "OR"].includes(key)) {
			LogicComparison.validate(query);
		}
		if (["LT", "GT", "EQ"].includes(key)) {
			MComparison.validate(query);
		}
		if (["IS"].includes(key)) {
			SComparison.validate(query);
		}
		if (["NOT"].includes(key)) {
			Negation.validate(query);
		}
	}
}

class LogicComparison {
	public static perform(query: any, data: any[]): any[] {
		const key = getKey(query);
		const val: any[] = getValue(query);
		const resultSet: any[][] = val.map((d) => {
			return QueryFilter.perform(d, data);
		});

		if (key === "AND") {
			return resultSet.reduce((a, b) => {
				return [...a].filter((i) => {
					return b.includes(i);
				});
			});
		} else {
			const result = resultSet.reduce((a, b) => {
				return a.concat(b);
			});
			return Array.from(new Set(result));
		}
	}

	public static validate(query: any): void {
		const key = getKey(query);
		const val = getValue(query);

		if (val.length === 0) {
			throw new InsightError("LogicComparison error: " + JSON.stringify(query));
		}
		if (!(["AND", "OR"].includes(key))) {
			throw new InsightError("LogicComparison error: " + JSON.stringify(query));
		}
		if (!(val instanceof Array)) {
			throw new InsightError("LogicComparison error: " + JSON.stringify(query));
		}
	}
}

class MComparison {
	public static perform(query: any, data: any[]): any[] {
		const key = getKey(query);
		const val = getValue(query);
		const field = getKey(val).split("_")[1];

		if (key === "GT") {
			return data.filter((d) => {
				return d[field] > getValue(val);
			});
		} else if (key === "LT") {
			return data.filter((d) => {
				return d[field] < getValue(val);
			});
		} else if (key === "EQ") {
			return data.filter((d) => {
				return d[field] === getValue(val);
			});
		}
		throw new InsightError("MComparison error: " + JSON.stringify(query));
	}

	public static validate(query: any): void {
		const val = getValue(query);

		if (typeof getValue(val) !== "number") {
			throw new InsightError("MComparison error: " + JSON.stringify(query));
		}
	}
}

class SComparison {
	public static perform(query: any, data: any[]): any[] {
		const key = getKey(query);
		const val = getValue(query);
		const field = getKey(val).split("_")[1];
		const pattern = getValue(val);

		if (key.startsWith("*") && key.endsWith("*")) {
			return data.filter((d) => {
				const s: string = d[field];
				return s.includes(pattern.replace("*", ""));
			});
		} else if (key.startsWith("*")) {
			return data.filter((d) => {
				const s: string = d[field];
				return s.endsWith(pattern.replace("*", ""));
			});
		} else if (key.endsWith("*")) {
			return data.filter((d) => {
				const s: string = d[field];
				return s.startsWith(pattern.replace("*", ""));
			});
		} else {
			return data.filter((d) => {
				const s: string = d[field];
				return s === pattern;
			});
		}
	}

	public static validate(query: any): void {
		const val = getValue(query);

		if (typeof getValue(val) !== "string") {
			throw new InsightError("SComparison error: " + JSON.stringify(query));
		}
	}
}

class Negation {
	public static perform(query: any, data: any[]): any[] {
		const val = getValue(query);
		const exclude = QueryFilter.perform(val, data);
		return data.filter((d) => {
			return !exclude.includes(d);
		});
	}

	public static validate(query: any): void {
		const val = getValue(query);

		if (!(val instanceof Object)) {
			throw new InsightError("Negation error: " + JSON.stringify(query));
		}
	}
}
