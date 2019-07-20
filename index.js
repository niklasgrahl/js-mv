#!/usr/bin/env node
const path = require('path');
const inquirer = require('inquirer');
const chalk = require('chalk');
const childProcess = require('child_process');
const globby = require('globby');
const pkgUp = require('pkg-up');
const moveFile = require('./moveFile.js');

const run = async ({from, to, move}) => {
  try {
    const find = new RegExp(from);

    const pkg = await pkgUp();
    const pkgRoot = path.dirname(pkg);

    const allJsFiles = globby.sync('**/*.js', {cwd: pkgRoot, gitignore: true});

    const files = move
      ? allJsFiles
          .filter(file => !!file.match(find))
          .map(file => file.replace('./', ''))
      : [from];

    if (!files.length) {
      console.log(chalk.red(`Found no matching files matching ${from}`));
      process.exit(1);
    }

    if (!to) {
      console.log(chalk.underline(`Found ${files.length} files:`));
      console.table(files.map(file => ({file})));
    }

    const fromTo = files.map(file => ({
      from: file,
      to: file.replace(find, to),
    }));

    console.log(chalk.yellow('This will rename the following files:'));
    console.table(fromTo);
    console.log(
      chalk.yellow(
        "⚠️  It's advised NOT to have any untracked changes when running this ⚠️",
      ),
    );

    const {doRun} = await inquirer.prompt([
      {name: 'doRun', type: 'confirm', message: 'Continue?'},
    ]);

    if (!doRun) return;
    fromTo.forEach(({from, to}, index) => {
      console.log(
        chalk.bgCyan.black(`Processing ${index + 1}/${fromTo.length}`),
      );
      moveFile(from, to, pkgRoot, move);
    });
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
};

const {argv} = require('yargs')
  .command(
    '$0 <from> <to>',
    'Move JS file and update all imports to/from that file(s)',
    yargs =>
      yargs
        .positional('from', {
          describe: 'file path or regex (with capture groups)',
          type: 'string',
        })
        .positional('to', {
          describe: 'file path (use $1, $2 etc. to reference captured groups)',
          type: 'string',
        })
        .option('move', {
          describe:
            'Move the file (use --no-move if you have already moved the file)',
          type: 'boolean',
          default: true,
        }),
  )
  .help();

run(argv);
