# Writes the Xcode project and the app's translated strings. Run again after
# changing a setting here:  python3 make_project.py
import hashlib, json, os

here = os.path.dirname(os.path.abspath(__file__))
BUNDLE = "today.pio.app"
VERSION, BUILD = "1.0", "2"


def uid(name):
    return hashlib.md5(name.encode()).hexdigest()[:24].upper()


def catalog(source, entries):
    strings = {}
    for key, values in entries.items():
        strings[key] = {
            "extractionState": "manual",
            "localizations": {
                lang: {"stringUnit": {"state": "translated", "value": text}}
                for lang, text in values.items()
            },
        }
    return {"sourceLanguage": source, "strings": strings, "version": "1.0"}


words = {
    "offline.title": {
        "es": "No logro conectarme",
        "en": "I can't connect",
        "de": "Ich kann mich nicht verbinden",
        "fr": "Je n'arrive pas à me connecter",
        "it": "Non riesco a connettermi",
        "pt": "Não consigo me conectar",
    },
    "offline.body": {
        "es": "Revisa tu internet y vuelve a intentar. Tus idiomas siguen guardados.",
        "en": "Check your internet and try again. Your languages are still saved.",
        "de": "Prüf dein Internet und versuch es noch einmal. Deine Sprachen sind noch gespeichert.",
        "fr": "Vérifie ton internet et réessaie. Tes langues sont toujours enregistrées.",
        "it": "Controlla internet e riprova. Le tue lingue sono ancora salvate.",
        "pt": "Verifique a internet e tente de novo. Os seus idiomas continuam guardados.",
    },
    "offline.retry": {
        "es": "Volver a intentar",
        "en": "Try again",
        "de": "Noch einmal versuchen",
        "fr": "Réessayer",
        "it": "Riprova",
        "pt": "Tentar de novo",
    },
}
plist = {
    "CFBundleDisplayName": {l: "pío" for l in ["es", "en", "de", "fr", "it", "pt"]},
    "NSMicrophoneUsageDescription": {
        "es": "pío te escucha solo cuando tocas Hablar, para traducir lo que dices y ayudarte a pronunciarlo.",
        "en": "pío listens only when you tap Speak, to translate what you say and help you pronounce it.",
        "de": "pío hört nur zu, wenn du auf Sprechen tippst, um zu übersetzen, was du sagst, und dir bei der Aussprache zu helfen.",
        "fr": "pío t'écoute seulement quand tu touches Parler, pour traduire ce que tu dis et t'aider à le prononcer.",
        "it": "pío ti ascolta solo quando tocchi Parla, per tradurre quello che dici e aiutarti a pronunciarlo.",
        "pt": "O pío escuta só quando você toca em Falar, para traduzir o que você diz e ajudar na pronúncia.",
    },
}
for name, data in [("Localizable.xcstrings", catalog("es", words)), ("InfoPlist.xcstrings", catalog("es", plist))]:
    with open(os.path.join(here, "Pio", name), "w") as f:
        json.dump(data, f, ensure_ascii=False, indent=2, sort_keys=True)
        f.write("\n")

I = {k: uid(k) for k in ["project", "target", "app", "info", "folder", "main", "products", "sources", "frameworks", "resources", "plist-debug", "plist-release", "t-debug", "t-release", "p-configs", "t-configs"]}

shared = """
				ALWAYS_SEARCH_USER_PATHS = NO;
				ASSETCATALOG_COMPILER_GENERATE_SWIFT_ASSET_SYMBOL_EXTENSIONS = YES;
				CLANG_ENABLE_MODULES = YES;
				CLANG_ENABLE_OBJC_ARC = YES;
				ENABLE_USER_SCRIPT_SANDBOXING = YES;
				IPHONEOS_DEPLOYMENT_TARGET = 17.0;
				LOCALIZATION_PREFERS_STRING_CATALOGS = YES;
				SDKROOT = iphoneos;
				SWIFT_VERSION = 5.0;"""
target = f"""
				ASSETCATALOG_COMPILER_APPICON_NAME = AppIcon;
				ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = AccentColor;
				CODE_SIGN_STYLE = Automatic;
				CURRENT_PROJECT_VERSION = {BUILD};
				DEVELOPMENT_TEAM = 63KYXTKT5A;
				ENABLE_PREVIEWS = YES;
				GENERATE_INFOPLIST_FILE = YES;
				INFOPLIST_FILE = Info.plist;
				INFOPLIST_KEY_CFBundleDisplayName = "pío";
				INFOPLIST_KEY_ITSAppUsesNonExemptEncryption = NO;
				INFOPLIST_KEY_LSApplicationCategoryType = "public.app-category.education";
				INFOPLIST_KEY_NSMicrophoneUsageDescription = "pío te escucha solo cuando tocas Hablar, para traducir lo que dices y ayudarte a pronunciarlo.";
				INFOPLIST_KEY_UIApplicationSceneManifest_Generation = YES;
				INFOPLIST_KEY_UIRequiresFullScreen = YES;
				INFOPLIST_KEY_UISupportedInterfaceOrientations = UIInterfaceOrientationPortrait;
				LD_RUNPATH_SEARCH_PATHS = (
					"$(inherited)",
					"@executable_path/Frameworks",
				);
				MARKETING_VERSION = {VERSION};
				PRODUCT_BUNDLE_IDENTIFIER = {BUNDLE};
				PRODUCT_NAME = "$(TARGET_NAME)";
				SUPPORTED_PLATFORMS = "iphoneos iphonesimulator";
				SUPPORTS_MACCATALYST = NO;
				SWIFT_EMIT_LOC_STRINGS = YES;
				TARGETED_DEVICE_FAMILY = 1;"""

project = f"""// !$*UTF8*$!
{{
	archiveVersion = 1;
	classes = {{
	}};
	objectVersion = 77;
	objects = {{

/* Begin PBXFileReference section */
		{I['app']} /* Pio.app */ = {{isa = PBXFileReference; explicitFileType = wrapper.application; includeInIndex = 0; path = Pio.app; sourceTree = BUILT_PRODUCTS_DIR; }};
		{I['info']} /* Info.plist */ = {{isa = PBXFileReference; lastKnownFileType = text.plist.xml; path = Info.plist; sourceTree = "<group>"; }};
/* End PBXFileReference section */

/* Begin PBXFileSystemSynchronizedRootGroup section */
		{I['folder']} /* Pio */ = {{
			isa = PBXFileSystemSynchronizedRootGroup;
			path = Pio;
			sourceTree = "<group>";
		}};
/* End PBXFileSystemSynchronizedRootGroup section */

/* Begin PBXFrameworksBuildPhase section */
		{I['frameworks']} /* Frameworks */ = {{
			isa = PBXFrameworksBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXFrameworksBuildPhase section */

/* Begin PBXGroup section */
		{I['main']} = {{
			isa = PBXGroup;
			children = (
				{I['folder']} /* Pio */,
				{I['info']} /* Info.plist */,
				{I['products']} /* Products */,
			);
			sourceTree = "<group>";
		}};
		{I['products']} /* Products */ = {{
			isa = PBXGroup;
			children = (
				{I['app']} /* Pio.app */,
			);
			name = Products;
			sourceTree = "<group>";
		}};
/* End PBXGroup section */

/* Begin PBXNativeTarget section */
		{I['target']} /* Pio */ = {{
			isa = PBXNativeTarget;
			buildConfigurationList = {I['t-configs']} /* Build configuration list for PBXNativeTarget "Pio" */;
			buildPhases = (
				{I['sources']} /* Sources */,
				{I['frameworks']} /* Frameworks */,
				{I['resources']} /* Resources */,
			);
			buildRules = (
			);
			dependencies = (
			);
			fileSystemSynchronizedGroups = (
				{I['folder']} /* Pio */,
			);
			name = Pio;
			productName = Pio;
			productReference = {I['app']} /* Pio.app */;
			productType = "com.apple.product-type.application";
		}};
/* End PBXNativeTarget section */

/* Begin PBXProject section */
		{I['project']} /* Project object */ = {{
			isa = PBXProject;
			attributes = {{
				BuildIndependentTargetsInParallel = 1;
				LastSwiftUpdateCheck = 2720;
				LastUpgradeCheck = 2720;
				TargetAttributes = {{
					{I['target']} = {{
						CreatedOnToolsVersion = 27.2;
					}};
				}};
			}};
			buildConfigurationList = {I['p-configs']} /* Build configuration list for PBXProject "Pio" */;
			developmentRegion = es;
			hasScannedForEncodings = 0;
			knownRegions = (
				es,
				en,
				de,
				fr,
				it,
				pt,
				Base,
			);
			mainGroup = {I['main']};
			minimizedProjectReferenceProxies = 1;
			preferredProjectObjectVersion = 77;
			productRefGroup = {I['products']} /* Products */;
			projectDirPath = "";
			projectRoot = "";
			targets = (
				{I['target']} /* Pio */,
			);
		}};
/* End PBXProject section */

/* Begin PBXResourcesBuildPhase section */
		{I['resources']} /* Resources */ = {{
			isa = PBXResourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXResourcesBuildPhase section */

/* Begin PBXSourcesBuildPhase section */
		{I['sources']} /* Sources */ = {{
			isa = PBXSourcesBuildPhase;
			buildActionMask = 2147483647;
			files = (
			);
			runOnlyForDeploymentPostprocessing = 0;
		}};
/* End PBXSourcesBuildPhase section */

/* Begin XCBuildConfiguration section */
		{I['plist-debug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{shared}
				DEBUG_INFORMATION_FORMAT = dwarf;
				ENABLE_TESTABILITY = YES;
				GCC_OPTIMIZATION_LEVEL = 0;
				ONLY_ACTIVE_ARCH = YES;
				SWIFT_ACTIVE_COMPILATION_CONDITIONS = "DEBUG $(inherited)";
				SWIFT_OPTIMIZATION_LEVEL = "-Onone";
			}};
			name = Debug;
		}};
		{I['plist-release']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{shared}
				DEBUG_INFORMATION_FORMAT = "dwarf-with-dsym";
				SWIFT_COMPILATION_MODE = wholemodule;
				VALIDATE_PRODUCT = YES;
			}};
			name = Release;
		}};
		{I['t-debug']} /* Debug */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{target}
			}};
			name = Debug;
		}};
		{I['t-release']} /* Release */ = {{
			isa = XCBuildConfiguration;
			buildSettings = {{{target}
			}};
			name = Release;
		}};
/* End XCBuildConfiguration section */

/* Begin XCConfigurationList section */
		{I['p-configs']} /* Build configuration list for PBXProject "Pio" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{I['plist-debug']} /* Debug */,
				{I['plist-release']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
		{I['t-configs']} /* Build configuration list for PBXNativeTarget "Pio" */ = {{
			isa = XCConfigurationList;
			buildConfigurations = (
				{I['t-debug']} /* Debug */,
				{I['t-release']} /* Release */,
			);
			defaultConfigurationIsVisible = 0;
			defaultConfigurationName = Release;
		}};
/* End XCConfigurationList section */
	}};
	rootObject = {I['project']} /* Project object */;
}}
"""
os.makedirs(os.path.join(here, "Pio.xcodeproj"), exist_ok=True)
with open(os.path.join(here, "Pio.xcodeproj", "project.pbxproj"), "w") as f:
    f.write(project)
print("project written")
