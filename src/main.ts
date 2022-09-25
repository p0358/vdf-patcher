const VDF_TRANSLATION_BASE = String.raw`
{
	"Language" "english"
	"Tokens"
	{
	}
}
`;

const VDF_PLACEHOLDER_LINE = '		"PLACEHOLDER" ""';

const VDF_REGEX = /^\s*\"(?<key>.+?(?<!\\)(?:\\\\)*)(?:\")\s+\"(?<val>.*?(?<!\\)(?:\\\\)*)(?:\")(?:\s*\[(?<cond>[^\]\/]*)\])?(?<comment>\s*\/+[^\r\n]*)?\s*$/d;

function unescape(input: string): string {
    return input.toString()
        .replace(/(?<!\\)(\\\\)*\\(["\'\?])/g, "$1$2")
        .replace(/(?<!\\)(\\\\)*\\(n)/g, "$1\n")
        .replace(/(?<!\\)(\\\\)*\\(t)/g, "$1\t")
        .replace(/(?<!\\)(\\\\)*\\(v)/g, "$1\v")
        .replace(/(?<!\\)(\\\\)*\\(b)/g, "$1\b")
        .replace(/(?<!\\)(\\\\)*\\(r)/g, "$1\r")
        .replace(/(?<!\\)(\\\\)*\\(f)/g, "$1\f")
        .replace(/(?<!\\)(\\\\)*\\(a)/g, "$1\a")
        .replace(/\\\\/g, "\\");
}

function escape(input: string): string {
    return input.toString()
        .replace(/\\/g, "\\\\")
        .replace(/"/g, '\\"')
        .replace(/\n/g, "\\n")
        .replace(/\t/g, "\\t")
        //.replace(/'/g, "\\'") // no need to escape
        //.replace(/\?/g, "\\?") // no need to escape
        .replace(/\x0B/g, "\\v")
        .replace(/\x08/g, "\\b")
        .replace(/\x0D/g, "\\r")
        .replace(/\x0C/g, "\\f")
        .replace(/\x07/g, "\\a");
}

export class VDFFileLine {
    line: string = "";
    valid: boolean = false;
    key: string = "";
    value: string = "";
    cond: string | undefined = undefined;
    comment: string | undefined = undefined;
    posKey: [number, number] = [-1, -1];
    posValue: [number, number] = [-1, -1];
    posComment: [number, number] | undefined = undefined;

    constructor(line: string) {
        this.line = line;
        this.refreshRegex();
    }

    refreshRegex() {
        type RegExpMatchArrayWithIndices = RegExpMatchArray & { indices: [number, number] & { groups: { [key: string]: [number, number] } } };
        const matched = VDF_REGEX.exec(this.line) as RegExpMatchArrayWithIndices;
        /*console.log("hmm", matched, {
            a: matched !== null,
            b: matched !== null && matched.groups !== undefined,
            c: matched !== null && matched.groups !== undefined && matched.groups.key !== undefined,
            d: matched !== null && matched.groups !== undefined && matched.groups.key !== undefined && matched.groups.value !== undefined
        });*/
        if (this.valid = (matched !== null && matched.groups !== undefined && matched.groups.key !== undefined && matched.groups.val !== undefined)) {
            //console.log("hmm2");
            this.key = unescape(matched.groups.key);
            this.value = unescape(matched.groups.val);
            this.cond = matched.groups.cond;
            this.comment = matched.groups.comment;
            this.posKey = matched.indices.groups.key;
            this.posValue = matched.indices.groups.val;
            this.posComment = matched.indices.groups.comment;
        }
    }

    toString() {
        return this.line;
    }

    setValue(newValue: string) {
        const newValueEscaped = escape(newValue);
        this.line = this.line.substr(0, this.posValue[0]) + newValueEscaped + this.line.substr(this.posValue[1]);
        this.value = newValue;
        const delta = this.posValue[0] + newValueEscaped.length - this.posValue[1]
        this.posValue = [this.posValue[0], this.posValue[0] + newValueEscaped.length];
        if (this.comment && this.posComment)
            this.posComment = [this.posComment[0] + delta, this.posComment[1] + delta];
    }

    setKey(newKey: string) {
        const newKeyEscaped = escape(newKey);
        this.line = this.line.substr(0, this.posKey[0]) + newKeyEscaped + this.line.substr(this.posKey[1]);
        this.key = newKey;
        const delta = this.posKey[0] + newKeyEscaped.length - this.posKey[1]
        this.posKey = [this.posKey[0], this.posKey[0] + newKeyEscaped.length];
        this.posValue = [this.posValue[0] + delta, this.posValue[1] + delta];
        if (this.comment && this.posComment)
            this.posComment = [this.posComment[0] + delta, this.posComment[1] + delta];
    }

    removeComment() {
        if (this.comment && this.posComment) {
            this.line = this.line.substr(0, this.posComment[0]) + this.line.substr(this.posComment[1]);
            this.comment = undefined;
            this.posComment = undefined;
        }
    }
}

type InsertOptions = { after?: number; } | { before?: number; };

export class VDFFileWrapper {
    private _raw: string;
    _lines: VDFFileLine[] = [];
    _linesMap: { [key: string]: VDFFileLine } = {};
    _keys: string[] = [];
    _isCRLF: boolean = false;

    constructor(contents?: string) {
        this._raw = contents || VDF_TRANSLATION_BASE;
        if (this._raw.endsWith("\r\n"))
            this._isCRLF = true;
        for (const rawline of this._raw.split(this._isCRLF ? "\r\n" : "\n")) {
            const line = new VDFFileLine(rawline);
            this._lines.push(line);
            if (line.valid)
                this._linesMap[line.key.toUpperCase()] = line;
        }
        this._refreshKeys();
    }

    private _refreshKeys() {
        this._keys = this._lines.filter(l => l.valid).map(l => l.key);
    }

    get(key: string): string {
        key = key.toUpperCase();
        if (key in this._linesMap && this._linesMap[key].valid)
            return this._linesMap[key].value;
        throw new RangeError("No valid line with such key");
    }

    delete(key: string) {
        key = key.toUpperCase();
        if (key in this._linesMap) {
            this._lines = this._lines.filter(l => l.key.toUpperCase() !== key);
            delete this._linesMap[key];
        }
    }

    set(key: string, value: string): boolean {
        key = key.toUpperCase();
        if (key in this._linesMap) {
            this._linesMap[key].setValue(value);
            this._refreshKeys();
            return true;
        } else {
            // add new line
            /*const lastLineText = this._lines.filter(l => l.valid).pop()?.line || VDF_PLACEHOLDER_LINE;
            const newLine = new VDFFileLine(lastLineText);
            newLine.setKey(key);
            newLine.setValue(value);
            newLine.removeComment();
            console.assert(newLine.valid, "Tried adding a new line, but it's invalid");*/
            return false;
        }
    }

    setOrInsert(key: string, value: string) {
        if (!this.set(key, value))
            this.insert(key, value);
    }

    setOrInsertLine(line: VDFFileLine) {
        if (!this.set(line.key, line.value))
            this.insertLine(line);
    }

    insert(key: string, value: string, insertOptions?: InsertOptions) {
        // start with last valid line or placeholder
        const lastValidLine = this._lines.filter((l, i) =>
            l.valid
            && !(l.key === "Language" && l === this._lines.filter(l => l.key === "Language").shift())
        ).pop();
        let templateLineText = lastValidLine?.line || VDF_PLACEHOLDER_LINE;

        let before: number | null = null;
        let after: number | null = null;
        let insertAt: number | null = lastValidLine ? (this._lines.lastIndexOf(lastValidLine) + 1) : null;
        if (insertAt === null) {
            // no valid lines exist, we gotta find insertion index another way
            const lastOpeningLine = this._lines.filter(l => !l.valid && l.line.includes("{")).pop();
            insertAt = lastOpeningLine ? (this._lines.lastIndexOf(lastOpeningLine) + 1) : this._lines.length;
        }

        if (insertOptions) {
            if ("after" in insertOptions && insertOptions.after !== undefined) {
                after = insertOptions.after;
                insertAt = after + 1;
                if (this._lines[after] === undefined)
                    throw new Error(`Line index ${after} not found when trying to insert a new key ${key} after it`);
                if (this._lines[after].valid)
                    templateLineText = this._lines[insertOptions.after].line;
            } else if ("before" in insertOptions && insertOptions.before !== undefined) {
                before = insertOptions.before;
                insertAt = before;
                if (this._lines[before] === undefined)
                    throw new Error(`Line index ${before} not found when trying to insert a new key ${key} before it`);
                if (this._lines[before].valid)
                    templateLineText = this._lines[insertOptions.before].line;
            }
        }

        const newLine = new VDFFileLine(templateLineText);
        //console.log("new line before insert", newLine);
        newLine.setKey(key);
        newLine.setValue(value);
        newLine.removeComment();
        console.assert(newLine.valid, "Tried adding a new line, but it's invalid");

        if (insertAt !== null) {
            this._lines.splice(insertAt, 0, newLine);
            this._linesMap[key.toUpperCase()] = newLine;
            this._refreshKeys();
        }
    }

    insertLine(line: VDFFileLine, insertOptions?: InsertOptions) {
        // start with last valid line or placeholder
        const lastValidLine = this._lines.filter((l, i) =>
            l.valid
            && !(l.key === "Language" && l === this._lines.filter(l => l.key === "Language").shift())
        ).pop();

        let before: number | null = null;
        let after: number | null = null;
        let insertAt: number | null = lastValidLine ? (this._lines.lastIndexOf(lastValidLine) + 1) : null;
        if (insertAt === null) {
            // no valid lines exist, we gotta find insertion index another way
            const lastOpeningLine = this._lines.filter(l => !l.valid && l.line.includes("{")).pop();
            insertAt = lastOpeningLine ? (this._lines.lastIndexOf(lastOpeningLine) + 1) : this._lines.length;
        }

        if (insertOptions) {
            if ("after" in insertOptions && insertOptions.after !== undefined) {
                after = insertOptions.after;
                insertAt = after + 1;
                if (this._lines[after] === undefined)
                    throw new Error(`Line index ${after} not found when trying to insert a new key ${line.key} after it`);
            } else if ("before" in insertOptions && insertOptions.before !== undefined) {
                before = insertOptions.before;
                insertAt = before;
                if (this._lines[before] === undefined)
                    throw new Error(`Line index ${before} not found when trying to insert a new key ${line.key} before it`);
            }
        }

        if (insertAt !== null) {
            this._lines.splice(insertAt, 0, line);
            this._linesMap[line.key.toUpperCase()] = line;
            this._refreshKeys();
        }
    }

    toString() {
        return this._lines.join(this._isCRLF ? "\r\n" : "\n");
    }

    copyFrom(from: VDFFileWrapper, addMissing: boolean = false) {
        let vi = 0;
        let prevLine: VDFFileLine | null = null;
        let prevLineValid: VDFFileLine | null = null;
        for (const [index, line] of from._lines.entries()) {
            if (!line.valid) {
                prevLine = line;
                prevLineValid = null; // only valid
                continue;
            }
            if (vi === 0 && line.key === "Language") { vi++; continue; }

            if (addMissing || line.key.toUpperCase() in this._linesMap)
                if (!this.set(line.key, line.value) && addMissing) {
                    // insert missing at sensible position

                    let prevLineInCurrent: VDFFileLine | undefined = undefined;
                    if (prevLine && prevLine.valid
                        && (prevLineInCurrent = this._lines.filter(l => l.key.toUpperCase() === prevLine?.key.toUpperCase())?.pop())) {
                        // prefer inserting after last valid line
                        const prevLineInCurrentIndex = this._lines.indexOf(prevLineInCurrent);
                        this.insertLine(line, { after: prevLineInCurrentIndex });
                    } else {
                        // try to look for next line, if it's valid, look for it in our lines
                        const maybeNextLine = from._lines[index + 1];
                        let nextLineInCurrent: VDFFileLine | undefined = undefined;
                        if (maybeNextLine && maybeNextLine.valid
                            && (nextLineInCurrent = this._lines.filter(l => l.key.toUpperCase() === maybeNextLine.key.toUpperCase())?.pop())) {
                                const nextLineInCurrentIndex = this._lines.indexOf(nextLineInCurrent);
                                this.insertLine(line, { before: nextLineInCurrentIndex });
                        } else if (prevLineValid && prevLineValid.valid
                            && (prevLineInCurrent = this._lines.filter(l => l.key.toUpperCase() === prevLineValid!.key.toUpperCase())?.pop())) {
                            // does not neighbour directly any valid line, fallback to inserting after any last valid line
                            // (not ideal since we won't be separated with whitespace anymore...)
                            const prevLineInCurrentIndex = this._lines.indexOf(prevLineInCurrent);
                            this.insertLine(line, { after: prevLineInCurrentIndex });
                        } else {
                            // will happen if file is empty
                            this.insertLine(line);
                        }
                    }
                }

            prevLine = line;
            prevLineValid = line;
            vi++;
        }
    }

    copyFromObject(obj: { [key: string]: string }, addMissing: boolean = false) {
        for (const [key, value] of Object.entries(obj)) {
            if (!this.set(key, value) && addMissing) {
                this.insert(key, value);
            }
        }
    }

    cleanAllValues() {
        let i = 0;
        for (const line of this._lines) {
            if (line.valid) {
                if (!(i === 0 && line.key === "Language"))
                    line.setValue("");
                i++;
            }
        }
        this._refreshKeys();
    }
}

/*let test1 = String.raw`
{
	"Language" "english"
	"Tokens"
	{
		"test1" "test2"//comment
	}
}
`;

let test_empty = String.raw`
{
	"Language" "english"
	"Tokens"
	{
	}
}
`;

const file = new VDFFileWrapper(test_empty);

file.setOrInsert("penis", "kaka");
//file.setOrInsert("penis", "dudu");
//file.set("test1", "test111");

console.log(file._lines);
console.log(file.toString());*/

