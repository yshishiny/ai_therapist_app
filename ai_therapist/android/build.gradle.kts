allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
subprojects {
    project.evaluationDependsOn(":app")
}

// Force all plugin subprojects (e.g. printing) to compile against SDK 36
// so that android:attr/lStar (API 31+) is always available.
subprojects {
    if (name != "printing") return@subprojects

    val forceLegacyAndroidPluginSdk = fun() {
        // Some older plugins (notably printing 5.13.x) still hardcode an old
        // compileSdkVersion in Groovy, which can win unless we override it here.
        val androidExtension = extensions.findByName("android") ?: return
        val methods = androidExtension.javaClass.methods.filter {
            it.name == "compileSdkVersion" && it.parameterCount == 1
        }
        val intMethod = methods.firstOrNull {
            it.parameterTypes[0] == Int::class.javaPrimitiveType ||
                it.parameterTypes[0] == Int::class.javaObjectType
        }
        val stringMethod = methods.firstOrNull {
            it.parameterTypes[0] == String::class.java
        }

        when {
            intMethod != null -> intMethod.invoke(androidExtension, 36)
            stringMethod != null -> stringMethod.invoke(androidExtension, "android-36")
        }
    }

    if (state.executed) {
        forceLegacyAndroidPluginSdk()
    } else {
        afterEvaluate {
            forceLegacyAndroidPluginSdk()
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
