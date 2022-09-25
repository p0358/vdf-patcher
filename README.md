# vdf-patcher

A **simple** library for patching existing Valve KeyValues files, while preserving the existing formatting of the file, including all the comments.

It does **not** support the whole VDF format or even nested keys, its support is aimed and limited at Source Engine's language localization files, so it only supports flat files with a single key-value pair on a single line. If you are looking for a full-fledged parser, you should take a look at [vdf-parser](https://github.com/p0358/vdf-parser) (but note that one doesn't preserve the formatting).

It can:
* change existing value/key of an existing line, keeping everything else the same
* apply values to current file from another
* add new values either at the end of the file or at selected position (before/after line index)
* automatically insert new values from another file, trying to guess their expected position in new file (based on the line directly before/after)
