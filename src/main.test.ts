import { file } from "@babel/types";
import { describe, expect, test } from "@jest/globals";
import { VDFFileWrapper, VDFFileLine } from "./main";

const empty_vdf = String.raw`
{
    "Language" "english"
    "Tokens"
    {
    }
}
`;

describe("vdf-patcher lines", () => {

    test("empty", () => {
        const line = new VDFFileLine('\t\t"kaka" ""');
        line.setValue("dudu");
        expect(line.line).toBe('\t\t"kaka" "dudu"');
    });

    test("with escaped backslash at the end", () => {
        const line = new VDFFileLine(String.raw`"kaka" "aaa\\"`);
        line.setValue("uuu\\");
        expect(line.line).toBe(String.raw`"kaka" "uuu\\"`);
    });

    test("with escaped quote at the end", () => {
        const line = new VDFFileLine(String.raw`"kaka" "aaa\""`);
        line.setValue('uuu"');
        expect(line.line).toBe(String.raw`"kaka" "uuu\""`);
    });

    test("comment should be preserved", () => {
        const line = new VDFFileLine(String.raw`"comment" "preserve this->"// test comment!`);
        line.setValue("preserved");
        expect(line.line).toBe(String.raw`"comment" "preserved"// test comment!`);
    });

    test("no unnecessary escape", () => {
        const line = new VDFFileLine(String.raw`"key" ""`);
        line.setValue(String.raw`'?ntvbrfa"`);
        expect(line.line).toBe(String.raw`"key" "'?ntvbrfa\""`);
    });

    test("escaping", () => {
        const line = new VDFFileLine(String.raw`"TEST_ESCAPES" "\"We test escapes\"\"\", trololo\\\", enter:\npost-enter, tab:\tpost-\\ta\b:\')\""`);
        expect(line.value).toBe(String.raw`"We test escapes""", trololo\", enter:` + "\npost-enter, tab:\tpost-" + String.raw`\ta` + "\b" + String.raw`:')"`);
        line.setValue(line.value.substr(0, 6) + "<NEW>" + line.value.substr(6));
        expect(line.line).toBe(String.raw`"TEST_ESCAPES" "\"We te<NEW>st escapes\"\"\", trololo\\\", enter:\npost-enter, tab:\tpost-\\ta\b:')\""`);
    });

});

describe("vdf-patcher files", () => {

    test("empty", () => {
        const file = new VDFFileWrapper(empty_vdf);

        file.setOrInsert("kaka", "dudu");
        //file.setOrInsert("penis", "dudu");
        //file.set("test1", "test111");

        //console.log(file._lines);
        //console.log(file.toString());
        console.log("uuuuuu", file._linesMap["kaka"]);

        const expected = `
{
    "Language" "english"
    "Tokens"
    {
\t\t"kaka" "dudu"
    }
}
`;
        expect(file.toString()).toBe(expected);
    });

    test("insert new at the end", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka"   "dudu" // comment
    }
}`);

        //console.log("eeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee", file._linesMap["kaka"]);
        file.setOrInsert("eee", "uwu");
        file.setOrInsert("eee", "owo");

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka"   "dudu" // comment
        "eee"   "owo"
    }
}`;
        expect(file.toString()).toBe(expected);
    });

    test("insert new after", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
        "kaka4"   "dudu4" // comment
        "kaka5"   "dudu5" // comment
    }
}`);

        const after = file._lines.findIndex(l => l.key === "kaka3");
        file.insert("insertion", "insval", { after });

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
        "insertion"   "insval"
        "kaka4"   "dudu4" // comment
        "kaka5"   "dudu5" // comment
    }
}`;
        expect(file.toString()).toBe(expected);
    });

    test("insert new before", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
        "kaka4"   "dudu4" // comment
        "kaka5"   "dudu5" // comment
    }
}`);

        const before = file._lines.findIndex(l => l.key === "kaka4");
        file.insert("insertion", "insval", { before });

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
        "insertion"   "insval"
        "kaka4"   "dudu4" // comment
        "kaka5"   "dudu5" // comment
    }
}`;
        expect(file.toString()).toBe(expected);
    });

    test("copyFromObject existing", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
    }
}`);

        const patch = {
            kaka1: "pepe1",
            kaka2: "pepe2",
            kaka3: "pepe3",
            kaka4: "pepe4",
        };

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // comment
        "kaka2"   "pepe2" // comment
        "kaka3"   "pepe3" // comment
    }
}`;
        file.copyFromObject(patch);
        expect(file.toString()).toBe(expected);
    });

    test("copyFromObject including new", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
    }
}`);

        const patch = {
            kaka1: "pepe1",
            kaka2: "pepe2",
            kaka3: "pepe3",
            kaka4: "pepe4",
        };

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // comment
        "kaka2"   "pepe2" // comment
        "kaka3"   "pepe3" // comment
        "kaka4"   "pepe4"
    }
}`;
        file.copyFromObject(patch, true);
        expect(file.toString()).toBe(expected);
    });

    test("copyFrom existing", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
        "kaka3"   "dudu3" // comment
    }
}`);

        const patch = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // different comment
        "kaka2"   "pepe2" // different comment
        "kaka3"   "pepe3" // different comment
        "kaka4"   "pepe4" // different comment
        "kaka5"   "pepe5" // different comment
    }
}`;

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // comment
        "kaka2"   "pepe2" // comment
        "kaka3"   "pepe3" // comment
    }
}`;
        file.copyFrom(new VDFFileWrapper(patch));
        expect(file.toString()).toBe(expected);
    });

    test("copyFrom existing including new", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka3"   "dudu3" // comment
        "kaka5"   "dudu5" // comment
    }
}`);

        const patch = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // different comment
        "kaka2"   "pepe2" // different comment
        "kaka3"   "pepe3" // different comment
        "kaka4"   "pepe4" // different comment
        "kaka5"   "pepe5" // different comment
    }
}`;

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // comment
        "kaka2"   "pepe2" // different comment
        "kaka3"   "pepe3" // comment
        "kaka4"   "pepe4" // different comment
        "kaka5"   "pepe5" // comment
    }
}`;
        file.copyFrom(new VDFFileWrapper(patch), true);
        expect(file.toString()).toBe(expected);
    });

    test("copyFrom test appends", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment

        "kaka4"   "dudu4" // comment

        "kaka5"   "dudu5" // comment
    }
}`);

        const patch = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // different comment
        "kaka2"   "pepe2" // different comment

        "kaka3"   "pepe3" // different comment
        "kaka4"   "pepe4" // different comment

        "kaka5"   "pepe5" // different comment

        "kaka6"   "pepe6" // different comment
    }
}`;

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "pepe1" // comment
        "kaka2"   "pepe2" // different comment

        "kaka3"   "pepe3" // different comment
        "kaka4"   "pepe4" // comment

        "kaka5"   "pepe5" // comment
        "kaka6"   "pepe6" // different comment
    }
}`;
        file.copyFrom(new VDFFileWrapper(patch), true);
        expect(file.toString()).toBe(expected);
    });

    test("delete", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
    }
}`);

        file.delete("KAKa2");

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
    }
}`;
        expect(file.toString()).toBe(expected);
    });

    test("cleanAllValues", () => {
        const file = new VDFFileWrapper(String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "dudu1" // comment
        "kaka2"   "dudu2" // comment
    }
}`);

        file.cleanAllValues();

        const expected = String.raw`
{
    "Language" "english"
    "Tokens"
    {
        "kaka1"   "" // comment
        "kaka2"   "" // comment
    }
}`;
        expect(file.toString()).toBe(expected);
    });

});
