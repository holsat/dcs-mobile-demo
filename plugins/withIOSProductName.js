const { withXcodeProject } = require('@expo/config-plugins');

/**
 * Expo Config Plugin to set iOS PRODUCT_NAME to "DCS+"
 * 
 * This plugin modifies the Xcode project during prebuild to ensure
 * the PRODUCT_NAME is set to "DCS+" for App Store submission.
 * 
 * Why is this needed?
 * - Expo's prebuild sanitizes the app name and removes the "+" character
 * - This causes PRODUCT_NAME to be set to "DCS" instead of "DCS+"
 * - An existing "DCS" app on the App Store blocks our submission
 * 
 * This plugin runs during prebuild and fixes the issue automatically.
 */
const withIOSProductName = (config) => {
  return withXcodeProject(config, (config) => {
    const xcodeProject = config.modResults;
    const configurations = xcodeProject.pbxXCBuildConfigurationSection();
    
    // Iterate through all build configurations
    Object.keys(configurations).forEach((key) => {
      const buildConfig = configurations[key];
      
      // Only modify configurations with buildSettings (skip comments)
      if (buildConfig.buildSettings && buildConfig.buildSettings.PRODUCT_NAME) {
        const currentName = buildConfig.buildSettings.PRODUCT_NAME;
        
        // Replace "DCS" with "DCS+" (handle both quoted and unquoted)
        if (currentName === 'DCS' || currentName === '"DCS"') {
          buildConfig.buildSettings.PRODUCT_NAME = '"DCS+"';
          console.log(`✅ Updated PRODUCT_NAME from ${currentName} to "DCS+"`);
        }
      }
    });
    
    return config;
  });
};

module.exports = withIOSProductName;
