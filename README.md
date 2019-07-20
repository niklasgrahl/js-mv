# js-mv

> Move .js file(s) and update all relative imports to/from that file(s) from the command line

For example, `js-mv a.js b.js`

## Install

```
$ npm install -g @niklasgrahl/js-mv
```

## Usage

```
// Show help
js-mv

// Rename A.js to B.js (updates all relative imports in your project from A.js to B.js)
js-mv A.js B.js

// Rename src/A.js to src/B.js using bash brace expansion (if you are using bash)
js-mv src/{A,B}.js

// Rename all .test.js files to .spec.js
// <from> get's passed into `new Regexp(from)` and you can reference the capture groups in [to] with $1, $2 etc.
js-mv '(.*).test.js' '$1.spec.js'

// Not specifying a second argument opens your default editor (try it out, it's pretty neat!)
js-mv 'src/(.*).js'

// Group redux files by feature instead of by type
js-mv '(reducers|actions)/([^/]\*).js' '$2/$1.js'
```

After running the command, all relative imports in your project should have been updated

## Caveats

- Only updates `.js` files
- Only tested with ES modules (`import`/`export`) and I'm not sure how well (if at all) it will work for CommonJS (`require`) modules

## About

Provides a CLI on top of [jscodeshift](https://github.com/facebook/jscodeshift) and [refactoring-codemods](https://github.com/jurassix/refactoring-codemods).

`js-mv` does the following for each file specified in [from]:

- Move the file (unless `--no-move` was provided)
- Traverses up the directory tree to the closest package.json
- Finds all .js files in that directory (excluding .gitignored files)
- Uses [import-declaration-transform](https://github.com/jurassix/refactoring-codemods#import-declaration-transform) and [import-relative-transform](https://github.com/jurassix/refactoring-codemods#import-relative-transform) codemods to update the imports to/from that file(s) in all .js files found in the previous step

## Todo

- [ ] Allow for other file extensions than `.js`
- [ ] Detect if file needs to be moved or not
- [ ] Detect what files have been moved based on git diff. This would allow you to move the files with whatever tool you want and `js-mv` would just update the imports for you
- [ ] Allow renaming import specifier (variable name) using [import-specifier-transform](https://github.com/jurassix/refactoring-codemods#import-specifier-transform)
- [ ] Make it a lot faster by combining the codemods into one that can rename multiple files at the same time
- [ ] Better documentation

## Related

- [jscodeshift](https://github.com/facebook/jscodeshift)
- [refactoring-codemods](https://github.com/jurassix/refactoring-codemods)
