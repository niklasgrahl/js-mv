#!/usr/bin/env node
const path = require('path')
const inquirer = require('inquirer')
const chalk = require('chalk')
const childProcess = require('child_process')
const globby = require('globby')
const pkgUp = require('pkg-up')
const moveFile = require('./moveFile.js')

const getRenames = async ({ pkgRoot, regex, from, to, move, git }) => {
  const find = regex ? new RegExp(from) : from

  if (git) return basedOnGit(pkgRoot)

  const allJsFiles = globby.sync('**/*.js', {
    cwd: pkgRoot,
    gitignore: true,
  })

  const files = move
    ? allJsFiles
        .filter(file =>
          regex
            ? !!file.match(find)
            : path.resolve(find) === path.resolve(pkgRoot, file)
        )
        .map(file => file.replace('./', ''))
    : [from]

  if (!files.length) {
    console.log(
      chalk.red(
        `Found no matching files matching ${from}. Did you forget --regex?`
      )
    )
    process.exit(1)
  }

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

    return fromEditor
      .split('\n')
      .map(line => line.split('->').map(s => s.trim()))
      .filter(([from, to]) => from && from !== to)
  } else {
    return files.map(file => [file, file.replace(find, to)])
  }
}

const run = async ({ from, to, git, move, regex, yes }) => {
  try {
    const pkg = await pkgUp()
    const pkgRoot = path.dirname(pkg)

    const renames = await getRenames({ pkgRoot, from, to, git, move, regex })

    if (!renames.length) {
      console.log(chalk.red(`Found no files to update`))
      process.exit(1)
    }

    console.log(chalk.yellow('This will rename the following files:'))
    console.table(renames)
    console.log(
      chalk.yellow(
        "⚠️  It's advised NOT to have any untracked changes when running this ⚠️"
      )
    )

    const { doRun = yes } = await inquirer.prompt([
      { name: 'doRun', type: 'confirm', message: 'Continue?', when: !yes },
    ])

    if (!doRun) return
    renames.forEach(([from, to], index) => {
      console.log(
        chalk.bgCyan.black(`Processing ${index + 1}/${renames.length}`)
      )
      moveFile(from, to, pkgRoot, move)
    })
  } catch (err) {
    console.error(err)
    process.exit(1)
  }
}

const basedOnGit = pkgRoot => {
  const renames = childProcess
    .execSync(
      `git add '${pkgRoot}' && git diff --cached --summary --diff-filter=R`,
      {
        encoding: 'utf-8',
      }
    )
    .split('\n')
    .filter(line => !!line)
    .map(line => line.replace(/ rename (.*) \(.*%\)/, '$1'))
    .map(line => line.replace(/(.*)\{(.*) => (.*)\}(.*)/, '$1$2$4 => $1$3$4'))
    .map(line => line.split(' => '))

  childProcess.execSync(`git reset '${pkgRoot}'`)

  return renames
}

const { argv } = require('yargs')
  .command(
    '$0 <from> [to]',
    'Moves .js file(s) and updates all relative imports to/from that file(s)',
    yargs =>
      yargs
        .positional('from', {
          describe:
            'source file path (regex if --regex flag is used; supports capture groups)',
          type: 'string',
        })
        .positional('to', {
          describe:
            'target file path (use $1, $2 etc. to reference captured groups). If not specified, opens your default editor',
          type: 'string',
        })
        .option('git', {
          describe:
            'Detect renamed files with git. <from> needs to be specified but will be ignored',
          type: 'boolean',
          default: false,
        })
        .option('regex', {
          describe: 'Treat <from> as a regex. Uses `new RegExp(from)`',
          type: 'boolean',
          default: false,
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
          '$0 . --git',
          'Find and update imports in renamed files using git'
        )
        .example(
          '$0 src/{A,B}.js',
          'Rename src/A.js to src/B.js using bash brace expansion'
        )
        .example(
          `$0 --regex '(.*)\\.test\\.js' '$1.spec.js'`,
          'Rename all *.test.js files to *.spec.js'
        )
        .example(
          `$0 --regex 'src/(.*)\\.js'`,
          'Rename all *.js files in the src directory using your default editor'
        )
        .example(
          `$0 '(reducers|actions)/([^/]*)\\.js' '$2/$1.js'`,
          'Group redux files by feature instead of by type'
        )
        .strict(true)
  )
  .help()

run(argv)
