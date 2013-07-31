organization := "edu.ucdavis"

name := "hubnet-web"

version := "0.6.8"

retrieveManaged := true

libraryDependencies ++= Seq(
  "net.databinder" %% "unfiltered-filter" % "0.6.8",
  "net.databinder" %% "unfiltered-jetty" % "0.6.8",
  "net.databinder" %% "unfiltered-netty-websockets" % "0.6.8",
  "org.clapper" %% "avsl" % "0.4",
  "net.databinder" %% "unfiltered-spec" % "0.6.8" % "test",
  "net.liftweb" %% "lift-json" % "2.5-M4"
)

resolvers ++= Seq(
  "java m2" at "http://download.java.net/maven/2"
)
