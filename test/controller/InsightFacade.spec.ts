import {IInsightFacade, InsightDatasetKind, InsightError, NotFoundError} from "../../src/controller/IInsightFacade";
import InsightFacade from "../../src/controller/InsightFacade";
import {expect, use} from "chai";
import chaiAsPromised from "chai-as-promised";
import {clearDisk, getContentFromArchives} from "../TestUtil";

use(chaiAsPromised);

describe("InsightFacade", function () {
	let facade: IInsightFacade;

	// Declare datasets used in tests. You should add more datasets like this!
	let sections: string;

	before(function () {
		// This block runs once and loads the datasets.
		sections = getContentFromArchives("pair.zip");

		// Just in case there is anything hanging around from a previous run of the test suite
		clearDisk();
	});

	describe("Handling Crashes", function() {
		before(function() {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});

		it("should handle addDataset after crash", async function() {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			let facade2 = new InsightFacade();
			const result = await facade2.addDataset("sections2", sections, InsightDatasetKind.Sections);
			expect(result).to.have.same.members(["sections2", "sections"]);
		});

		it("should handle list after crash", async function() {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			let facade2 = new InsightFacade();
			const result = await facade2.listDatasets();
			expect(result).to.have.lengthOf(1);
			expect(result).to.deep.equal([
				{
					id: "sections",
					kind: InsightDatasetKind.Sections,
					numRows:64612
				}
			]);
		});

		it("should handle remove after crash", async function() {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			let facade2 = new InsightFacade();
			const result = await facade2.removeDataset("sections");
			expect(result).to.equal("sections");
		});

	});

	describe("Add/Remove/List Dataset", function () {
		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
		});

		beforeEach(function () {
			// This section resets the insightFacade instance
			// This runs before each test
			console.info(`BeforeTest: ${this.currentTest?.title}`);
			facade = new InsightFacade();
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
		});

		afterEach(function () {
			// This section resets the data directory (removing any cached data)
			// This runs after each test, which should make each test independent of the previous one
			console.info(`AfterTest: ${this.currentTest?.title}`);
			clearDisk();
		});

		// This is a unit test. You should create more like this!
		it ("should reject with  an empty dataset id", function() {
			const result = facade.addDataset("", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject ids containing underscore", function() {
			const result = facade.addDataset("data_set", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject ids only containing whitespace", function() {
			const result = facade.addDataset("  ", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject duplicate ids", function() {
			const result = facade.addDataset("dataset", sections, InsightDatasetKind.Sections)
				.then(() => facade.addDataset("dataset", sections, InsightDatasetKind.Sections));
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject invalid dataset kind", function() {
			const result = facade.addDataset("dataset", sections, InsightDatasetKind.Rooms);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject invalid dataset", function() {
			const result = facade.addDataset("dataset", "dataset", InsightDatasetKind.Sections);
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should successfully add one dataset", function() {
			const result = facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			return expect(result).to.eventually.deep.equal(["sections"]);
		});

		// remove dataset tests
		it("should reject removing nonexistent id", function() {
			const result = facade.removeDataset("badid");
			return expect(result).to.eventually.be.rejectedWith(NotFoundError);
		});

		it("should reject removing empty id", function() {
			const result = facade.removeDataset("");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject removing whitespace id", function() {
			const result = facade.removeDataset("  ");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject removing ids with underscore", function() {
			const result = facade.removeDataset("cpsc_310");
			return expect(result).to.eventually.be.rejectedWith(InsightError);
		});

		it("should reject removing twice", async function() {
			await facade.addDataset("sections", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("sections");
			const result = await facade.removeDataset("sections");

			expect(result).to.be.rejectedWith(NotFoundError);

		});

		it("should delete existing dataset", async function() { //
			await facade.addDataset("cpsc310", sections, InsightDatasetKind.Sections);
			await facade.removeDataset("cpsc310");

			const result = await facade.listDatasets();

			expect(result).to.have.lengthOf(0);
		});

		it("should remove correct dataset", async function() {
			await facade.addDataset("data", sections, InsightDatasetKind.Sections);
			await facade.addDataset("data2", sections, InsightDatasetKind.Sections);
			const result1 = await facade.removeDataset("data2");

			const result = await facade.listDatasets();

			expect(result).to.have.lengthOf(1);
			expect(result1).to.equal("data2");

		});

		it("should return correct existing dataset", function() {
			const result = facade.addDataset("cpsc310", sections, InsightDatasetKind.Sections)
				.then(() => facade.listDatasets());

			return expect(result).eventually.to.have.lengthOf(1);
		});

		it("should return no datasets", function() {
			const result = facade.listDatasets();
			return expect(result).eventually.to.have.lengthOf(0);
		});


		/* it("should return multiple datasets", async function() {
			await facade.addDataset("cpsc310", sections, InsightDatasetKind.Sections);
			await facade.addDataset("cpsc313", sections, InsightDatasetKind.Sections);
			await facade.addDataset("cpsc320", sections, InsightDatasetKind.Sections);

			const result = await facade.listDatasets();

			expect(result).to.have.lengthOf(3);
			expect(result).to.deep.equal([
				{
					id: "cpsc310",
					kind: InsightDatasetKind.Sections,
					numRows:64612
				},
				{
					id: "cpsc313",
					kind: InsightDatasetKind.Sections,
					numRows:64612
				},
				{
					id: "cpsc320",
					kind: InsightDatasetKind.Sections,
					numRows:64612
				}
			]);
		}); */
	});

	/*
	 * This test suite dynamically generates tests from the JSON files in test/resources/queries.
	 * You should not need to modify it; instead, add additional files to the queries directory.
	 * You can still make tests the normal way, this is just a convenient tool for a majority of queries.
	 */
	describe("PerformQuery", () => {
		type Input = any;
		type Output = any;
		type Error = "InsightError" | "ResultTooLargeError";

		before(function () {
			console.info(`Before: ${this.test?.parent?.title}`);
			clearDisk();

			facade = new InsightFacade();
			const content = getContentFromArchives("pair.zip");
			return facade.addDataset("sections", content, InsightDatasetKind.Sections)
				.then((res) => {
					return facade.addDataset("courses", content, InsightDatasetKind.Sections);
				}).catch((err)=>{
					console.log("Can not add courses and/or sections for perform query test");
				});

			// Load the datasets specified in datasetsToQuery and add them to InsightFacade.
			// Will *fail* if there is a problem reading ANY dataset.
			// const loadDatasetPromises = [
				// facade.addDataset("sections", sections, InsightDatasetKind.Sections),
			// ];

			// return Promise.all(loadDatasetPromises);
		});

		after(function () {
			console.info(`After: ${this.test?.parent?.title}`);
			clearDisk();
		});

		// type PQErrorKind = "ResultTooLargeError" | "InsightError";

		/* folderTest<Input, Output, Error>(
			"Dynamic InsightFacade PerformQuery tests",
			(input) => facade.performQuery(input),
			"./test/resources/queries",
			{
				assertOnResult: function assertResult(actual: unknown, expected, input): void {
					// TODO add an assertion!
					expect(actual).to.deep.members(expected);
					const optionKeys = Object.keys(input["OPTIONS"]);

					if (optionKeys.includes("ORDER")) {
						expect(actual).to.deep.ordered.members(expected);
					}
				},
				// errorValidator: (error): error is PQErrorKind =>
					// error === "ResultTooLargeError" || error === "InsightError",
				assertOnError: function assertError(actual: any, expected: Error): void {
					// TODO add an assertion!
					if (expected === "InsightError") {
						expect(actual).to.be.an.instanceOf(InsightError);
					} else if (expected === "ResultTooLargeError") {
						expect(actual).to.be.an.instanceOf(ResultTooLargeError);
					} else {
						expect.fail("Unknown error");
					}
				},
			}
		); */
	});
});
