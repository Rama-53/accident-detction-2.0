import zmq

class ZmqPub:
    def __init__(self, port=5556, bind_addr=None):
        self.ctx = zmq.Context()
        self.sock = self.ctx.socket(zmq.PUB)
        addr = bind_addr or f"tcp://*:{port}"
        self.sock.bind(addr)
        self.addr = addr

    def send_json(self, obj: dict):
        import json
        self.sock.send_string(json.dumps(obj))

    def close(self):
        self.sock.close()
        self.ctx.term()

class ZmqSub:
    def __init__(self, host='localhost', port=5556, topic_filter=''):
        self.ctx = zmq.Context()
        self.sock = self.ctx.socket(zmq.SUB)
        addr = f"tcp://{host}:{port}"
        self.sock.connect(addr)
        self.sock.setsockopt_string(zmq.SUBSCRIBE, topic_filter)
        self.addr = addr

    def recv_string(self):
        return self.sock.recv_string()

    def close(self):
        self.sock.close()
        self.ctx.term()
