
Hubnet-web Extension
====================

Working repository originally cloned from NetLogo's HubNet-Web-Extension
This version comes with an expanded Javascript client that runs on iOS devices.

Charlie Turner, UC Davis
July 31, 2013

Original hubnet-web extension upgraded for:
	
* Scala 2.7.7 => 2.9.2
* sbt 0.7.7 => 0.12.3
* unfiltered 0.5.1 => 0.6.8
	
The upgrade of unfiltered (websocket libraries) is the ultimate driver due to array indexing errors
when trying to send base64 images across the websocket.   Bug reports on the web indicate this was
a buffer overflow problem in early versions and was fixed prior to 0.6.8.

The other big advantage of doing this upgrade is that it uses the current version of sbt which
has different build.sbt file conventions from earlier versions.

References
-----------

sbt (Scala Build Tool)
	http://www.scala-sbt.org/

Unfiltered 
	http://unfiltered.databinder.net/
	http://unfiltered.databinder.net/Try+Unfiltered.html (specifically for install!)

Conscript
	https://github.com/n8han/conscript


Overview of setup and new project creation
------------------------------------------

>curl https://raw.github.com/n8han/conscript/master/setup.sh | sh
>~/bin/cs n8han/giter8
>~/bin/g8 unfiltered/unfiltered --name=hubnet-web
>cd hubnet-web
>sbt console

Then copy scala source files into hubnet-web/src/main/scala/
copy Makefile to top-level

>make

Then start adding libraries to build.sbt

Also added one line `retrieveManaged := true` to build.sbt in order to get local copy of jars
Added `find lib_managed -name "*.jar" -exec cp {} . \;` to Makefile in order to get jars into root for NetLogo

