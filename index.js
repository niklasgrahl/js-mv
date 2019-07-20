#!/usr/bin/env node
const path = require('path')
const inquirer = require('inquirer')
const chalk = require('chalk')
const childProcess = require('child_process')
const globby = require('globby')
const pkgUp = require('pkg-up')
const moveFile = require('./moveFile.js')

const run = async ({ from, to, move, yes }) => {
  try {
    const find = new RegExp(from)

    const pkg = await pkgUp()
    const pkgRoot = path.dirname(pkg)

    const allJsFiles = globby.sync('**/*.js', {
      cwd: pkgRoot,
      gitignore: true,
    })

    const files = move
      ? allJsFiles
          .filter(file => !!file.match(find))
          .map(file => file.replace('./', ''))
      : [from]

    if (!files.length) {
      console.log(chalk.red(`Found no matching files matching ${from}`))
      process.exit(1)
    }

    let fromTo
    if (!to) {
      const maxLength = files.reduce(
        (maxLength, file) => Math.max(maxLength, file.length),
        0
      )
      const editText = files
        .map(file => `${file}${' '.repeat(maxLength - file.length)} -> ${file}`)
        .join('\n')

      const { fromEditor } = await inquirer.prompt([
        {
          name: 'fromEditor',
          message: `Second argument (to) wasn't specified. Use editor instead?`,
          type: 'editor',
          default: editText,
        },
      ])

      fromTo = fromEditor
        .split('\n')
        .map(line => line.split('->').map(s => s.trim()))
        .filter(([from, to]) => from && from !== to)
    } else {
      fromTo = files.map(file => [file, file.replace(find, to)])
    }

    console.log(chalk.yellow('This will rename the following files:'))
    console.table(fromTo)
    console.log(
      chalk.yellow(
        "⚠️  It's advised NOT to have any untracked changes when running this ⚠️"
      )
    )

    const { doRun = yes } = await inquirer.prompt([
      { name: 'doRun', type: 'confirm', message: 'Continue?', when: !yes },
    ])

    if (!doRun) return
    fromTo.forEach(([from, to], index) => {
      console.log(
        chalk.bgCyan.black(`Processing ${index + 1}/${fromTo.length}`)
      )
      moveFile(from, to, pkgRoot, move)
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const { argv } = require('yargs')
  .command(
    '$0 <from> [to]',
    'Moves .js file(s) and updates all relative imports to/from that file(s)',
    yargs =>
      yargs
        .positional('from', {
          describe: 'source file path or regex (supports capture groups)',
          type: 'string',
        })
        .positional('to', {
          describe:
            'target file path (use $1, $2 etc. to reference captured groups). If not specified, opens your default editor',
          type: 'string',
        })
        .option('yes', {
          describe: `Don't ask for confirmation before updating files (Always say yes)`,
          type: 'boolean',
          default: false,
        })
        .option('move', {
          describe:
            'Move the file (use --no-move if you have already moved the file)',
          type: 'boolean',
          default: true,
        })
        .example('$0 A.js B.js', 'Rename file A.js to B.js')
        .example(
          '$0 src/{A,B}.js',
          'Rename src/A.js to src/B.js using bash brace expansion'
        )
        .example(
          `$0 '(.*).test.js' '$1.spec.js'`,
          'Rename all *.test.js files to *.spec.js'
        )
        .example(
          `$0 'src/(.*).js'`,
          'Rename all *.js files in the src directory using your default editor'
        )
        .example(
          `$0 '(reducers|actions)/([^/]*).js' '$2/$1.js'`,
          'Group redux files by feature instead of by type'
        )
  )
  .help()

run(argv)
