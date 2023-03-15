import {
	InsightError

} from "./IInsightFacade";
import JSZip from "jszip";
import * as parse5 from "parse5";
import * as http from "http";


interface Building {
	fullname: string | undefined;
	shortname: string | undefined;
	number: string | undefined;
	name: string | undefined;
	address: string | undefined;
	lat: number | undefined;
	lon: number | undefined;
	href: string | undefined;
	seats: number | undefined;
	type: string | undefined;
	furniture: string | undefined;
}
export default class RoomHelper {
	// private zip = new JSZip();
	public processRooms(content: string): Promise<any[]> {
		return new Promise<string[]>((resolve, reject) => {
			JSZip.loadAsync(content, {base64: true})
				.then((zip) => {
					// this.zip = zip;
					let indexFile = zip.file("index.htm");
					if (indexFile !== null) {
						indexFile.async("string").then((fileContent) => {
							let document = parse5.parse(fileContent);
							let buildings = this.parseIndex(document, zip);
							resolve(buildings);
						});
					} else {
						reject(new InsightError());
					}
				});
		});
	}

	// parse content inside index.htm
	public async parseIndex(document: any, zip: JSZip): Promise<any[]> {
		// stub
		let table = this.findNode(document, "tbody");
		if (table === 0) {
			throw new InsightError();
		}
		let rows = this.findNodes(table, "tr");
		let content = this.parseBuildingDetails(rows, zip);
		this.getGeoLocation(content);


		return [];


	}

	public parseBuildingDetails(rows: any, zip: JSZip): Building[]{
		const buildingFilePaths = new Map<string, Building>();
		const result: Building[] = [];
		// for each row of index table (each building in index.htm)
		for (const row of rows) {
			if (row.childNodes.length > 0) {
				let buildingDetails = this.findNodes(row, "td");
				this.getBuildingDetails(buildingDetails, buildingFilePaths);
				this.parseFiles(zip, buildingFilePaths).then((r) => {
					return result.push(...r);
				});

			}
		}
		return result;
	}

	// given list of nodes to a row's cells, get the shortname, full name and address of each building
	// returns a map with the key as path and values as building
	private getBuildingDetails(buildingDetails: any[],
							   buildingFilePaths: Map<string, Building>): Map<string, Building> {
		let buildingFilePath: string = "";
		let b: Building = {
			address: undefined,
			fullname: undefined,
			furniture: undefined,
			lat: undefined,
			lon: undefined,
			name: undefined,
			number: undefined,
			href: undefined,
			seats:undefined,
			shortname: undefined,
			type: undefined
		};
		// each cell
		for (const td of buildingDetails) {
			buildingFilePath = this.getBuildingValues(td, b, buildingFilePath);
			if (buildingFilePath !== "") {
				buildingFilePaths.set(buildingFilePath, b);
			}
		}
		return buildingFilePaths;
	}

	private getBuildingValues(td: any, b: Building, buildingFilePath: string) {
		switch (td.attrs[0].value) {
			case "views-field views-field-field-building-code":
				for (const node of td.childNodes) {
					if (node.nodeName === "#text") {
						b.shortname = node.value.trim();
						break;
					}
				}
				break;

			case "views-field views-field-title":
				for (const node of td.childNodes) {
					if (node.nodeName === "a") {
						for (const name of node.childNodes) {
							if (node.nodeName === "text") {
								b.fullname = node.value.trim();
								break;
							}
						}
						for (const attr of node.attrs) {
							if (attr.name === "href") {
								buildingFilePath = attr.value;
								break;
							}
						}
					}
				}
				break;

			case "views-field views-field-field-building-address":
				for (const node of td.childNodes) {
					if (node.nodeName === "text") {
						b.address = node.value.trim();
						break;
					}
				}
				break;
			default:
				break;
		}
		return buildingFilePath;
	}

// Parses all the files and return a list of rooms
	public async parseFiles(zip: JSZip, building: Map<string, Building>): Promise<Building[]> {
		let result: Building[] = [];
		// let buildingPaths: any[];

		// get all building files
		let files = await this.getBuildingFiles(building, zip);
		// let documents = this.parseBuildingFiles(files);
		let curr = 0;
		let buildings = Array.from(building.keys());

		// for each building file
		for (let file of files) {
			let value = building.get(buildings[curr]);
			if (value !== undefined) {
				let document = parse5.parse(file);
				let tbody = this.findNode(document, "tbody");
				let rows = this.findNodes(tbody, "tr");
				// for each row in the building file
				for(const row of rows) {
					// get the cells of each row
					let tds = this.findNodes(row, "td");
					this.parseRoomDetails(tds, value, result);
				}
			}
			curr++;
		}
		return Promise.all(result);
	}

	private parseRoomDetails(tds: any, value: Building, res: Building[]) {
		// loop through each column and get href, number, seats, furniture, and number
		for (const td of tds) {
			for (const attr of td.attrs) {
				if (attr.name === "class") {
					for (const childNodes of td.childNodes) {
						this.getRoomDetails(childNodes, attr, value);
					}
				}
			}
			res.push(value);
		}
	}

	private getRoomDetails(childNodes: any, attr: any, value: Building) {
		switch (attr.value) {
			case "views-field views-field-field-room-number":
				if (childNodes.nodeName === "a") {
					for (let a of childNodes.attrs) {
						if (a === "href") {
							value.href = a.value;
						}
					}
					for (let text of childNodes.childNodes) {
						if (text.nodeName === "#text") {
							value.number = text.value;
							break;
						}
					}
				}
				break;
			case "views-field views-field-field-room-capacity":
				if (childNodes.nodeName === "#text") {
					value.seats = childNodes.value.trim();
				}
				break;
			case "views-field views-field-field-room-furniture":
				if (childNodes.nodeName === "#text") {
					value.furniture = childNodes.value.trim();
				}
				break;
			case "views-field views-field-field-room-type":
				if (childNodes.nodeName === "#text") {
					value.type = childNodes.value.trim();
				}
				break;
			default:
				break;
		}
	}

	private getGeoLocation(buildings: Building[]) {
		for(const b of buildings) {
			if(b.address !== undefined) {
				const url = "http://cs310.students.cs.ubc.ca:11316/api/v1/project_team041/" +
					encodeURIComponent(b.address);

			}
		}

	}

	// https://stackoverflow.com/questions/67591100/how-to-parse-with-parse5
	public findNode(node: any, tag: string): any {
		for (let i = 0; i < node.childNodes?.length; i++) {
			// if child nodes of nodes has tag matching needed tag, return the corresponding node
			if (node.childNodes[i].tagName === tag) {
				return node.childNodes[i];
			}
			// else recurse on the child nodes
			let result: any;
			result = this.findNode(node.childNodes[i], tag);
			if (result) {
				return result;
			}
		}
		return 0;

	}

	private findNodes(node: any, tag: string): any[] {
		let matchingNodes: any[] = [];
		for (let i = 0; i < node.childNodes?.length; i++) {
			// if child nodes of nodes has tag matching needed tag, add the node to the array of matching nodes
			if (node.childNodes[i].tagName === tag) {
				matchingNodes.push(node.childNodes[i]);
			}
			// else recurse on the child nodes and add any matching nodes to the array
			let childMatchingNodes = this.findNodes(node.childNodes[i], tag);
			if (childMatchingNodes.length > 0) {
				matchingNodes.push(...childMatchingNodes);
			}
		}
		return matchingNodes;
	}

	private getBuildingFiles(building: Map<string, Building>, zip: JSZip): Promise<string[]>{
		const paths = Array.from(building.keys());
		const promises = paths.map((path) => {
			const file = zip.file(path);
			if (file !== null) {
				return file.async("string");
			}
			return Promise.reject(new Error(`File not found: ${path}`));
		});
		return Promise.all(promises);
	}


}
