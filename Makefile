#
# Makefile for hubnet-web.jar NetLogo Extension
#
# updated to use:
#
#	Scala 2.9.2
#	sbt 0.12.3
#	unfiltered 0.6.8
#
# Charlie Turner, UC Davis
# May 9, 2013
#
# Note: had to add one line to build.sbt in order to get libraries into the "managed" library folder lib_managed
# retrieveManaged := true
# They are normally kept in repositories in ~/.ivy/ and other similar places

ifeq ($(origin NETLOGO), undefined)
  NETLOGO=../..
endif

ifeq ($(origin SCALA_HOME), undefined)
  SCALA_HOME=../..
endif

TARGET=hubnet-web.jar

SRCS=$(wildcard src/main/scala/*.scala)

MANAGED_JARS=.
NETLOGO_JAR=NetLogo.jar

hubnet-web.jar: $(SRCS) manifests/web.txt Makefile
	# make sure we have the current NetLogo.jar in the "unmanaged" lib directory
	mkdir -p lib
	cp $(NETLOGO)/$(NETLOGO_JAR) lib/
	# compile scala code using build.sbt; this also creates lib_managed folder, depositing "managed" jars there
	sbt update compile
	# copy "managed" jar files into a central location for inclusion in hubnet-web.jar
	find lib_managed -name "*.jar" -exec cp {} $(MANAGED_JARS) \;
	# create hubnet-web.jar extension
	jar cmf manifests/web.txt $(TARGET) -C target/scala-2.9.2/classes/ . -C $(MANAGED_JARS)/ .


clean:
	# remove the extension
	rm -f $(TARGET)
	# clean out all managed libraries 
	sbt clean
	rm -rf $(MANAGED_JARS)/*.jar
	# remove the "unmanaged" NetLogo.jar - it gets replaced by current version in make process
	rm -f lib/$(NETLOGO_JAR)


