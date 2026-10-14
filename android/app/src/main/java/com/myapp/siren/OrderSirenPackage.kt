package com.myapp.siren

import com.facebook.react.BaseReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.module.model.ReactModuleInfo
import com.facebook.react.module.model.ReactModuleInfoProvider

class OrderSirenPackage : BaseReactPackage() {
  override fun getModule(name: String, reactContext: ReactApplicationContext): NativeModule? {
    return if (name == OrderSirenModule.NAME) OrderSirenModule(reactContext) else null
  }

  override fun getReactModuleInfoProvider(): ReactModuleInfoProvider {
    return ReactModuleInfoProvider {
      mapOf(
          OrderSirenModule.NAME to
              ReactModuleInfo(
                  OrderSirenModule.NAME,
                  OrderSirenModule.NAME,
                  false,
                  false,
                  false,
                  false,
              ),
      )
    }
  }
}
