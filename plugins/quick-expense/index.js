// Config plugin: põe `MivenQuickExpense.swift` (App Intent "Registar despesa", ADR-042) no alvo
// principal do projeto iOS gerado pelo `expo prebuild`. Sem extensões: o IPA continua sem .appex.
const fs = require('node:fs');
const path = require('node:path');
const { IOSConfig, withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const SOURCE = 'MivenQuickExpense.swift';

function withQuickExpense(config) {
  config = withDangerousMod(config, [
    'ios',
    async (modConfig) => {
      const projectName = IOSConfig.XcodeUtils.getProjectName(modConfig.modRequest.projectRoot);
      const target = path.join(modConfig.modRequest.platformProjectRoot, projectName, SOURCE);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.copyFileSync(path.join(__dirname, SOURCE), target);
      return modConfig;
    },
  ]);

  return withXcodeProject(config, (modConfig) => {
    const projectName = IOSConfig.XcodeUtils.getProjectName(modConfig.modRequest.projectRoot);
    const filepath = `${projectName}/${SOURCE}`;
    if (!modConfig.modResults.hasFile(filepath)) {
      IOSConfig.XcodeUtils.addBuildSourceFileToGroup({
        filepath,
        groupName: projectName,
        project: modConfig.modResults,
      });
    }
    return modConfig;
  });
}

module.exports = withQuickExpense;
