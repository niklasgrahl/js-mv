const path = require('path');
const fs = require('fs');
const childProcess = require('child_process');
const globby = require('globby');
const execSync = cmd =>
  childProcess.execSync(cmd, {
    stdio: ['pipe', process.stdout, process.stderr],
  });

module.exports = (from, to, root, move = true) => {
  from = path.resolve(root, from);
  to = path.resolve(root, to);
  const toDir = path.dirname(to);
  const codemodDir = path.resolve(
    __dirname,
    'node_modules/refactoring-codemods/lib/transformers',
  );

  fs.mkdirSync(toDir, {recursive: true});
  if (move) fs.renameSync(from, to);

  const allJsFiles = globby.sync('**/*.js', {
    cwd: root,
    absolute: true,
    gitignore: true,
  });

  execSync(`
    jscodeshift \
      -t ${codemodDir}/import-declaration-transform.js \
      ${allJsFiles.join(' ')} \
      --prevFilePath=${from} \
      --nextFilePath=${to} \
      --parser=flow
  `);

  execSync(`
    jscodeshift \
      -t ${codemodDir}/import-relative-transform.js \
      ${to} \
      --prevFilePath=${from} \
      --nextFilePath=${to} \
      --parser=flow
  `);
};
