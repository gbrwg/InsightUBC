import JSZip from "jszip";
import {InsightError} from "./IInsightFacade";
import * as parse5 from "parse5";
import {Node} from "parse5/dist/tree-adapters/default";
import * as Http from "http";

export default class RoomDataSetHelper {
	public static process(content: string): Promise<any[]> {
		let zipFiles: JSZip;
		const buildingHtmPromises: Array<Promise<string>> = [];
		const buildings: any[] = [];
		return JSZip.loadAsync(content, {base64: true})
			.then((zip) => {
				if (zip.file("index.htm") === undefined) {
					throw new InsightError();
				} else {
					zipFiles = zip;
					return zip.file("index.htm")?.async("string");
				}
			}).then((indexHtm) => {
				if (!indexHtm) {
					throw new InsightError();
				}

				const indexHtmEle = parse5.parse(indexHtm);
				const result: any[] = [];
				RoomDataSetHelper.findTableEle(indexHtmEle,result);

				if (result.length === 1) {
					let temp: any[] = [];
					RoomDataSetHelper.findBuildEles(result[0], temp);
					temp = temp.slice(1); // remove the table head row
					RoomDataSetHelper.createBuildings(temp, buildings);
					RoomDataSetHelper.loadRoomFiles(zipFiles, buildings, buildingHtmPromises);
					return Promise.all(buildings.map((b) => {
						return RoomDataSetHelper.getLonLat(b);
					}));
				} else {
					throw new InsightError();
				}
			}).then((geoLocs) => {
				for (let i = 0; i < geoLocs.length; i++) {
					buildings[i]["lat"] = geoLocs[i]["lat"];
					buildings[i]["lon"] = geoLocs[i]["lon"];
				}
				return Promise.all(buildingHtmPromises);
			}).then((roomsStrs) => {
				return this.loadRooms(roomsStrs, buildings);
			}).catch((err) => {
				throw new InsightError(err);
			});
	}

	private static loadRooms(roomsStrs: Array<Awaited<string>>, buildings: any[]) {
		return roomsStrs.map((room) => {
			return parse5.parse(room);
		}).map((roomHtmEles) => {
			const roomTableEle: any[] = [];
			RoomDataSetHelper.findRoomTable(roomHtmEles, roomTableEle);

			if (roomTableEle.length === 0) {
				return [];
			} else if (roomTableEle.length === 1) {
				const buildingName: string[] = [];
				RoomDataSetHelper.findBuildingName(roomHtmEles, buildingName);
				const rooms: any[] = RoomDataSetHelper.createRoomObjs(roomTableEle[0]);

				if (rooms.length > 0) {
					RoomDataSetHelper.matchRoomWithBuilding(buildingName[0], rooms, buildings);
				}
				return rooms;
			} else {
				throw new InsightError("Too many table in building html file");
			}
		}).flat();
	}

	private static findRoomTable(node: Node, result: any[]) {
		if("nodeName" in node && node.nodeName === "tbody"){
			result.push(node);
		}

		if ("childNodes" in node) {
			node.childNodes.forEach((n: Node) => {
				RoomDataSetHelper.findRoomTable(n, result);
			});
		}
	}

	private static getLonLat(building: any): Promise<any> {
		return new Promise((resolve, reject) => {
			const add = building["address"].split(" ").join("%20");
			const url = `http://cs310.students.cs.ubc.ca:11316/api/v1/project_team041/${add}`;
			Http.get(url, (res) => {
				res.setEncoding("utf8");
				let result: string[] = [];
				res.on("data", (chunk) => {
					result.push(chunk);
				});
				res.on("end", () => {
					try {
						return resolve(JSON.parse(result.join()));
					} catch (err) {
						return reject("Something wrong when retrieving geo location");
					}
				});
			}).on("Error", (e) => {
				return reject(e);
			});
		});
	}


	private static createRoomObjs(node: Node) {
		if("childNodes" in node){
			return node.childNodes.filter((n) => {
				return n.nodeName === "tr";
			}).map((tr) => {
				if("childNodes" in tr){
					return tr.childNodes.filter((x) => {
						return x.nodeName === "td";
					});
				}
				throw new InsightError("No child node in room tr");
			}).map((tr) => {
				const room: any = {};

				if ("childNodes" in tr[0] && "childNodes" in tr[0].childNodes["1"]
					&& "value" in tr[0].childNodes["1"].childNodes[0]) {
					room["number"] = tr[0].childNodes["1"].childNodes[0].value;
				}
				if ("childNodes" in tr[1] && "value" in tr[1].childNodes[0]) {
					room["seats"] = Number.parseInt(tr[1].childNodes[0].value.trim(), 10);
				}
				if ("childNodes" in tr[2] && "value" in tr[2].childNodes[0]) {
					room["furniture"] = tr[2].childNodes[0].value.trim();
				}
				if ("childNodes" in tr[3] && "value" in tr[3].childNodes[0]) {
					room["type"] = tr[3].childNodes[0].value.trim();
				}
				if ("childNodes" in tr["0"] && "attrs" in tr["0"].childNodes["1"]) {
					room["href"] = tr["0"].childNodes["1"].attrs["0"].value;
				}
				return room;
			});
		}
		throw new InsightError("No child nodes in room tbody");
	}

	private static loadRoomFiles(zip: JSZip, buildings: any[], promises: Array<Promise<string>>) {
		 buildings.forEach((b) => {
			const file = zip.file(b["href"].replace("./",""))?.async("string");
			if (file) {
				promises.push(file);
			} else {
				throw new InsightError();
			}
		});
	}

	private static createBuildings(nodes: Node[], buildings: any[]){
		nodes.forEach((node) => {
			const building: any = {};

			if ("childNodes" in node) {
				const valueNodes = node.childNodes.filter((n) => {
					return n.nodeName === "td";
				});

				if (valueNodes.length > 0) {
					if ("childNodes" in valueNodes[1] && "value" in valueNodes[1].childNodes[0]) {
						building["shortname"] = valueNodes[1].childNodes[0].value.trim();
					}
					if ("childNodes" in valueNodes[2] && "childNodes" in valueNodes[2].childNodes[1] &&
						"value" in valueNodes[2].childNodes[1].childNodes[0]) {
						building["fullname"] = valueNodes[2].childNodes[1].childNodes[0].value.trim();
					}
					if ("childNodes" in valueNodes[2] && "attrs" in valueNodes[2].childNodes[1]) {
						building["href"] = valueNodes[2].childNodes[1].attrs[0].value;
					}
					if ("childNodes" in valueNodes[3] && "value" in valueNodes[3].childNodes[0]) {
						building["address"] = valueNodes[3].childNodes[0].value.trim();
					}
				}
			}
			buildings.push(building);
		});
	}

	private static findBuildEles(node: Node, result: any[]) {
		if ("attrs" in node) {
			if("nodeName" in node && node.nodeName === "tr"){
				result.push(node);
			}
		}

		if ("childNodes" in node) {
			node.childNodes.forEach((n: Node) => {
				RoomDataSetHelper.findBuildEles(n, result);
			});
		}
	}

	private static findTableEle(node: Node, result: any[]) {
		if ("attrs" in node) {
			const candidates = node.attrs.filter((attr) => {
				return attr.name === "id" && attr.value === "main";
			});

			if (candidates.length > 0) {
				result.push(node);
			}
		}
		if ("childNodes" in node) {
			node.childNodes.forEach((n: Node) => {
				RoomDataSetHelper.findTableEle(n, result);
			});
		}
	}


	private static findBuildingName(node: any, result: string[]) {
		if ("attrs" in node) {
			const x = node.attrs.find((attr: any)=>{
				return attr.name === "id" && attr.value === "building-info";
			});

			if (x) {
				result.push(node.childNodes["1"].childNodes["0"].childNodes["0"].value);
			}
		}

		if ("childNodes" in node) {
			node.childNodes.forEach((n: Node) => {
				RoomDataSetHelper.findBuildingName(n, result);
			});
		}
	}

	private static matchRoomWithBuilding(buildingName: string, rooms: any[], buildings: any[]) {
		const build = buildings.find((building) => {
			return building["fullname"] === buildingName;
		});
		rooms.forEach((r) => {
			r["fullname"] = build["fullname"];
			r["shortname"] = build["shortname"];
			r["name"] = build["shortname"] + "_" + r["number"];
			r["address"] = build["address"];
			r["lat"] = build["lat"];
			r["lon"] = build["lon"];
			return r;
		});
	}
}
