import java.net.Socket
import org.nlogo.api._
import org.nlogo.api.Syntax._
//import org.nlogo.hubnet.protocol.ExitMessage
import org.nlogo.hubnet.server.HubNetManager

case class Server(serverPort:Int, hubnetPort: Int){
  import unfiltered.netty.websockets._
  import unfiltered.util._
  import scala.collection.mutable.ConcurrentMap
  import unfiltered.response.ResponseString
  import scala.collection.JavaConversions._

  @volatile private var alive = true

  // moved these two up here with some hope of closing connections on unload
  //  cjt 9-19-12 - 
  val connections: ConcurrentMap[Int, Connection] = new java.util.concurrent.ConcurrentHashMap[Int, Connection]
  def channelId(s:WebSocket) = s.channel.getId.intValue

  var serverThread: Thread = _  // default value, possible null

  def afterStart(value : unfiltered.netty.Http) : Unit = println("CJT Calling AfterStart")	// cjt
  def afterStop(value : unfiltered.netty.Http) : Unit = println("CJT Calling AfterStop")	// cjt


  def stop(){ 
	println("Server.stop() called @@@@@@")
	serverThread.interrupt()
	alive = false 
  }

  def status() {
	println("Server.status() called @@@@@@")
	println("Number of connections = " + connections.size)
	println("Keys = " + connections.keys)
  }
 
  case class Connection(ws:WebSocket){
    // when a js client connects, create a socket to hubnet.
    val jsonProtocol = new JSONProtocol(s => ws.send(s))
    val hubnetSocket: Socket = new Socket("127.0.0.1", hubnetPort)
    val hubnetProtocol = new HubNetProtocol(hubnetSocket.getInputStream, hubnetSocket.getOutputStream)

 	@volatile private var talive = true

  	def whileTAliveDo(f: => Unit){
		println("cjt-hubnetweb: whileTAliveDo called")
    	new Thread(new Runnable { def run() { while(talive) f } }).start()
  	}

	println("cjt-hubnetweb: new Connection created alive = " + alive)
    // while alive, read messages from hubnet and send them to the websocket.
    // was this: cjt:   whileAliveDo{ jsonProtocol.writeMessage(hubnetProtocol.readMessage())  }

    // while alive, read messages from hubnet and send them to the websocket.
    whileTAliveDo{
       // was: try jsonProtocol.writeMessage(hubnetProtocol.readMessage())  - split into 3 lines to add logging - cjt
	   // normal condition is to continually read Hubnet messages, convert to JSON, and send out on websocket
	   try {
		val hnmsg = hubnetProtocol.readMessage()
		println("hubnet-send: " + JSONProtocol.toJSON(hnmsg))
		jsonProtocol.writeMessage(hnmsg)
       } catch { 
		  // if NetLogo receives an ExitMessage it will close this channel and an exception will be thrown
		  // in this case, we close the associated websocket, then take ourselves out of the connections hash
		  // TODO: is there a way to forcefully close the connection to the client or is that not a problem?
		  case eof:java.io.EOFException => 
			println("hubnet-web: got EOFException ws = " + ws)	
			connections -= channelId(ws)
			talive = false	// exit this listen loop
	   }
	}


    def receive(msg:String) {
      // when we receive a message from a js client, we need to translate
      // it from json and send it to the hubnet server as a Message
      val hubnetMessageFromJSON = JSONProtocol.fromJSON(msg)
      println("hubnetMessageFromJSON: " + hubnetMessageFromJSON)
      hubnetProtocol.writeMessage(hubnetMessageFromJSON)
    }

    // when a client closes, we should disconnect from hubnet
    def exit() {
	  talive = false
	  println("hubnet-web: client closed.")
      hubnetProtocol.writeMessage(org.nlogo.hubnet.protocol.ExitMessage("client closed."))
    }
  
  }

  def run() {
    println("hubnet-web: running new server on port: " + serverPort)
	println("hubnet-web:run: size of connections: " + connections.size)
/// ****** Trying moving these two out to server
    //val connectionsOld: ConcurrentMap[Int, Connection] = new java.util.concurrent.ConcurrentHashMap[Int, Connection]
    //def channelId(s:WebSocket) = s.channel.getId.intValue

    // assign new listening thread to serverThread so that we can interrupt it on NetLogo unload
    serverThread = new Thread(new Runnable() {
      def run() {
			
		var netty_http_handler = unfiltered.netty.Http(serverPort).handler(unfiltered.netty.websockets.Planify({
	           case _ => {
	             case Open(s) =>
	               println("hubnet-web: connection opened: " + s)
	               connections += (channelId(s) -> Connection(s))
	             case Message(s, Text(msg)) =>
	               println("hubnet-web: got message: " + msg)
	               connections(channelId(s)).receive(msg)
	             case Close(s) =>
	               println("hubnet-web: connection closed: " + s)
				  // if client exits cleanly with ExitMessage, then NetLogo will close its
				  // hubnet socket, and the error handler (above) will remove the channelId from connections
				  // the case handled here is where client abruptly closes websocket or exits without
				  // sending the ExitMessage to NetLogo
			 	  if (connections.containsKey(channelId(s))) {
	               	connections(channelId(s)).exit()
	               	connections -= channelId(s)
	   		 	  }
	             case Error(s, e) => 
			 		println("hubnet-web: Error detected!")
			 		e.printStackTrace
	           }
	         })
			 .onPass(_.sendUpstream(_)))
	        //http_socket.handler(unfiltered.netty.cycle.Planify{ case _ => ResponseString("not a websocket")})
		    // .beforeStop {	// added cjt
		    //  shutdown()
		    // }
		
		try {
			println("About to call netty_http_handler.run()")
	        netty_http_handler.run(afterStart, afterStop) // {s =>  } //Browser.open("file://goo.html")
			println("After netty_http_handler.run()")
    	} catch {
			// We've been interrupted: no more messages.
			case e: InterruptedException =>	// cjt
		              // Thread.currentThread.interrupt()
				println("WE HAVE BEEN INTERRUPTED!!!!!")
				netty_http_handler.stop()
				//http_socket.shutdown()	// cjt
				//shutdown()
	        	//return;
				if (Thread.currentThread() == serverThread) {
					println("currentThread is serverThread")
				} else {
					println("currentThread is NOT serverThread")
				}//preserve the message
				
				return
				//return;//Stop doing whatever I am doing and terminate
		    case e => throw e			
    	}							// cjt

      }
    }, "main")// cjt: adding 2nd arg to Thread - thread name.  See README_scala_upgrades.txt

	serverThread.start()	// start thread
   // }).start() // - cjt tinkering: this was original - generating Embedded server message in system.log

  }
}

object HubNetWebExtension {	
  var so: Option[Server] = None
  var em: org.nlogo.workspace.ExtensionManager = null

  def start(port:Int){
    so match {
      case Some(s) => {
		throw new ExtensionException("already listening")
	  }
      case None => { 
		so = Some(Server(port, hubNetPort))
		so.foreach(_.run()) 
	  }
    }
  }
  def stop() { 
	println("HubNetWebExtension.stop called ******")
	so.foreach(_.stop()); so = None 
  }

  def hubNetPort =
    em.workspace.getHubNetManager.asInstanceOf[HubNetManager].connectionManager.port

  // status - added by cjt to poke at things whenever I want
  def status() {
	println("hubnet-web:status: called")
	so match {
		case Some(s) => {
			s.status()
		}
		case None => {
			println("hubnet-web:status: HMMMM so is None")
		}
	}
  }
}


class HubNetWebExtension extends DefaultClassManager {
  def load(manager: PrimitiveManager) {
    manager.addPrimitive("start", new Start)
    manager.addPrimitive("stop", new Stop)
	manager.addPrimitive("status", new Status)
  }
  override def runOnce(em: ExtensionManager) {
    HubNetWebExtension.em = em.asInstanceOf[org.nlogo.workspace.ExtensionManager]
  }
  override def unload(em: ExtensionManager){ 
	println("****** UNLOAD IS called *****")
	HubNetWebExtension.stop() 
	}
}

class Start extends DefaultCommand {
  override def getSyntax = commandSyntax(Array(NumberType))
  def perform(args: Array[Argument], context: Context){
	println("Hello from hubnet-web extension Start")
	HubNetWebExtension.start(args(0).getIntValue)
  }
}


class Stop extends DefaultCommand {
  override def getSyntax = commandSyntax(Array[Int]())
  def perform(args: Array[Argument], context: Context){ 
	println("******* Stop CLASS was called ******")
	HubNetWebExtension.stop() 
  }
}

// TODO: convert this to a DefaultReporter

class Status extends DefaultCommand {
  override def getSyntax = commandSyntax(Array[Int]())
  def perform(args: Array[Argument], context: Context){ 
	println("******* Status CLASS was called ******")
	HubNetWebExtension.status() 
  }
}
