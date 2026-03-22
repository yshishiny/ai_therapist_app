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

// Force all plugin subprojects (e.g. printing) to use compileSdk 35
// so that android:attr/lStar (API 31+) is always available.
subprojects {
    afterEvaluate {
        if (extensions.findByName("android") != null) {
            val androidExt = extensions.getByName("android")
            val compileSdkMethod = androidExt.javaClass.methods.find { it.name == "setCompileSdkVersion" && it.parameterCount == 1 && it.parameterTypes[0] == Int::class.java }
            compileSdkMethod?.invoke(androidExt, 35)
        }
    }
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
