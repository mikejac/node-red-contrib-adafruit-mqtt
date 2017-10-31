/**
 * NodeRED Adafruit IO MQTT
 * Copyright (C) 2017 Michael Jacobsen.
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <http://www.gnu.org/licenses/>.
 **/

module.exports = function(RED) {
    "use strict";

    //
    function topicUpdateSubscribe(username, feedname) {
        return  username + "/" +
                "feeds/" +
                feedname
    }

	/******************************************************************************************************************
	 * 
	 *
	 */
    function AdafruitIONode(config) {
        RED.nodes.createNode(this, config)

        // MQTT properties
        this.qos        = 0
        this.retain     = false
        this.broker     = config.broker
        this.username   = config.username
        this.feedname   = config.feedname
        this.broker     = config.broker
        this.brokerConn = RED.nodes.getNode(this.broker)

        var node = this
        
        if (this.brokerConn) {
            node.brokerConn.register(node)
        } else {
            node.log(RED._("mqtt-client.errors.missing-config"))
            return
        }

        this.on('close', function(done) {
            node.brokerConn.deregister(node, done)
        })

        if (node.brokerConn.connected) {
            node.status({fill:"green", shape:"dot", text:"node-red:common.status.connected"})
        }

        var topic = topicUpdateSubscribe(node.username, node.feedname)

        RED.log.debug("AdafruitIONode(): subscribe topic = " + topic)

        //
        // incoming data from Adafruit IO
        //
        this.brokerConn.subscribe(topic, node.qos, function(topic, payload, packet) {
            try {
                RED.log.debug("AdafruitIONode(subscribe): topic   = " + topic)
                RED.log.debug("AdafruitIONode(subscribe): payload = " + payload)

                var tokenizer = topic.split("/")
                var count     = tokenizer.length

                if (count != 3) {
                    node.error("AdafruitIONode(subscribe): invalid topic; count != 3 -- " + topic)
                } else {
                    var msg = {
                        topic: tokenizer[2],    // the feedname
                        payload: payload        // the value
                    }
    
                    node.send(msg)
                }
            } catch (err) {
                RED.log.error("malformed object: " + payload.toString())
            }
        }, node.id)
        
        //
        // respond to inputs from NodeRED
        //
        this.on('input', function (msg) {
            if (!msg.hasOwnProperty('topic')) {
                RED.log.warn('Invalid message (topic missing)')
                return
            } else if (!msg.hasOwnProperty('payload')) {
                RED.log.warn('Invalid message (payload missing)')
                return
            }

            var topic = topicUpdateSubscribe(node.username, node.feedname)
            
            RED.log.debug("AdafruitIONode(on-input): publish topic = " + topic)
            
            msg.topic  = topic
            msg.qos    = node.qos
            msg.retain = node.retain
        
            node.brokerConn.publish(msg)
        })
    }
    
    RED.nodes.registerType('adafruit-io', AdafruitIONode)
}
