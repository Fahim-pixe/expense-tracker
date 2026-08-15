plugins {
    id("com.android.application")
    id("org.jetbrains.kotlin.android")
    id("org.jetbrains.kotlin.plugin.compose")
    id("com.google.devtools.ksp")
    id("androidx.room")
}

val nativeReleaseStoreFile = providers.gradleProperty("nativeReleaseStoreFile").orNull
    ?: System.getenv("NATIVE_ANDROID_KEYSTORE_PATH")
val nativeReleaseKeyAlias = providers.gradleProperty("nativeReleaseKeyAlias").orNull
    ?: System.getenv("NATIVE_ANDROID_KEY_ALIAS")
val nativeReleaseStorePassword = providers.gradleProperty("nativeReleaseStorePassword").orNull
    ?: System.getenv("NATIVE_ANDROID_KEYSTORE_PASSWORD")
val nativeReleaseKeyPassword = providers.gradleProperty("nativeReleaseKeyPassword").orNull
    ?: System.getenv("NATIVE_ANDROID_KEY_PASSWORD")
val nativeReleaseSigningConfigured = listOf(
    nativeReleaseStoreFile,
    nativeReleaseKeyAlias,
    nativeReleaseStorePassword,
    nativeReleaseKeyPassword,
).all { !it.isNullOrBlank() }

android {
    namespace = "com.fahimpixe.expensetracker"
    compileSdk = 35

    defaultConfig {
        applicationId = "com.fahimpixe.expensetracker"
        minSdk = 26
        targetSdk = 35
        versionCode = 1
        versionName = "1.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables.useSupportLibrary = true
    }

    buildTypes {
        release {
            isMinifyEnabled = true
            isShrinkResources = true
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro",
            )
            if (nativeReleaseSigningConfigured) {
                signingConfig = signingConfigs.getByName("release")
            }
        }
    }

    signingConfigs {
        create("release") {
            if (nativeReleaseSigningConfigured) {
                storeFile = file(nativeReleaseStoreFile!!)
                storePassword = nativeReleaseStorePassword
                keyAlias = nativeReleaseKeyAlias
                keyPassword = nativeReleaseKeyPassword
            }
        }
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }
}

dependencies {
    val composeBom = platform("androidx.compose:compose-bom:2024.12.01")
    implementation(composeBom)
    androidTestImplementation(composeBom)

    implementation("androidx.core:core-ktx:1.15.0")
    implementation("androidx.lifecycle:lifecycle-runtime-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-ktx:2.8.7")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.activity:activity-compose:1.10.0")
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.room:room-runtime:2.7.2")
    implementation("androidx.room:room-ktx:2.7.2")
    ksp("androidx.room:room-compiler:2.7.2")

    testImplementation("junit:junit:4.13.2")
    testImplementation("androidx.room:room-testing:2.7.2")
    androidTestImplementation("androidx.test:core-ktx:1.6.1")
    androidTestImplementation("androidx.test.ext:junit:1.2.1")
    androidTestImplementation("androidx.test.espresso:espresso-core:3.6.1")
    androidTestImplementation("androidx.room:room-testing:2.7.2")
    androidTestImplementation("androidx.compose.ui:ui-test-junit4")
    debugImplementation("androidx.compose.ui:ui-tooling")
    debugImplementation("androidx.compose.ui:ui-test-manifest")
}

room {
    schemaDirectory("$projectDir/schemas")
}
