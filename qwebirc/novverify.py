from twisted.internet.ssl import ClientContextFactory

class NoVerifyClientContextFactory(ClientContextFactory):
    def getContext(self):
        ctx = ClientContextFactory.getContext(self)
        try:
            # For PyOpenSSL
            ctx.set_verify(0, lambda *a: True)
        except Exception:
            pass
        return ctx
