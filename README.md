**Warning: do not use this unless you know what you're doing. There is no support.**

I only published this so that I would personally have a way to install ghost via npm in a node v6 / npm v3 environment. However, the repo is public so potentially someone else might find it useful.

This package:

- removes the semver node engine check so that it installs without complaint on any version of node
- removes the shrinkwrapped package.json
- allows dependencies to use the latest minor semver version (added `^` in package.json)
- npm version you get from `npm install ghost-node6` is the `stable` branch; the client admin ember app is built with node v4.4.3 (ember-cli version used in ghost does not support node 6)

Ghost devs **do not support** this way of using ghost. That being said, "it works for me" - YMMV.

The ghost team is not providing support for node v6 yet. Please use the official package unless you want the specific changes made in this package.

<a href="https://github.com/TryGhost/Ghost">Official Ghost Github Repository</a>