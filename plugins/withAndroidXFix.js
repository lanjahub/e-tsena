const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Expo config plugin to fix AndroidX/Support library conflicts
 * This uses a "Dependency Substitution" strategy which is safer than exclusion.
 * instead of just removing the old library (which crashes the app),
 * it tells Gradle: "When someone asks for 'support-v4', give them 'androidx-legacy' instead."
 */
module.exports = function withAndroidXFix(config) {
  return withAppBuildGradle(config, (config) => {
    const buildGradle = config.modResults.contents;

    // 1. Add Packaging Options to resolve duplicate META-INF files
    const packagingOptions = `
    packagingOptions {
        pickFirst 'META-INF/androidx.appcompat_appcompat.version'
        pickFirst 'META-INF/proguard/androidx-annotations.pro'
        pickFirst 'lib/x86/libc++_shared.so'
        pickFirst 'lib/x86_64/libc++_shared.so'
        pickFirst 'lib/armeabi-v7a/libc++_shared.so'
        pickFirst 'lib/arm64-v8a/libc++_shared.so'
    }
`;

    if (!buildGradle.includes("pickFirst 'META-INF/androidx.appcompat_appcompat.version'")) {
      config.modResults.contents = config.modResults.contents.replace(
        /android\s*{/,
        `android {
${packagingOptions}`
      );
    }

    // 2. Dependency Substitution Strategy
    // This maps old libraries to their AndroidX equivalents
    const substitutionStrategy = `
configurations.all {
    resolutionStrategy {
        force 'androidx.core:core:1.13.1'
        force 'androidx.versionedparcelable:versionedparcelable:1.1.1'
        
        dependencySubstitution {
            substitute module('com.android.support:support-v4') using module('androidx.legacy:legacy-support-v4:1.0.0')
            substitute module('com.android.support:support-appcompat-v7') using module('androidx.appcompat:appcompat:1.1.0')
            substitute module('com.android.support:appcompat-v7') using module('androidx.appcompat:appcompat:1.1.0')
            substitute module('com.android.support:design') using module('com.google.android.material:material:1.0.0')
        }
    }
}
`;

    if (!config.modResults.contents.includes("substitute module('com.android.support:support-v4')")) {
        config.modResults.contents = config.modResults.contents.replace(
            /dependencies\s*{/,
            `${substitutionStrategy}
dependencies {`
        );
    }

    return config;
  });
};

