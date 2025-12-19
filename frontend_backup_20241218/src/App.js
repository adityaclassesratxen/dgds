   seesee  fr retimpr xi  ar   ar  ru il
    p
      s ilerd = prev  lrere  rr fle)=> 
          d   cont,  } contact           ner
  }s              iv      lasaer a:     label asacts        n csmef seter  etate         serses= terpe
      ame
      sa
      ut
      tee
                  na=am
      actonfonam
             onhandleCustomerChange vent     const  nam ae= eventrge   ettoerforepre :le 
     errorsname {
      errorse      }
    
  }
  onsanlssae=ex edae>
    e>
      empa x>                   csaletcte  exlae>
    settpre >
      pan             nt
                 tpe=emai   amai       cstmrna        onasre  pacontct i                 {    seddrere  p etepdessprelen    };
  osaddoat   > {
    eose  p cetetttre.ln    };
           e  
    etepe
      csfle iter i>         if iteser > dismr  tee
        l    i  }      
                  i>
                    cst fted eiter            leesmetat> consrimary lt
        i   id0}            tut
        onliar         xt       csmefeim {
     nextrrone ore rere
    }   tmfoemiltri 
      xt    
     ls csme 
      xt             ddress
      xt   ton   i
     els
      addresses.a((addr) => 
        i addressine               nextrrorsaesses  dss le itn uty e ee
                     assme= isra 
        xtosaess =ele   ddress
      
         ats.lengh 
      xttt                    tton           onli()  emer()
          xt               els i 1testtatoneree            xt       
                     cassme=  
        exto     tt
               xt  }
      vent      ventv
     vlas= aido
     becteslate
                    esine
                iput
                  tee
        addrsesaddreses            addressine addressLine,
           adrit
          sate ddrstate    postcode ostloe
                      
                abe             label catlae
           t
          int
                    ttatueresscy
                 eAddreses(etetretue)
                         cs detl rorrestae    etiatdel ordelestione         
      el
             < classNae="me-s text-slate-00">
      <i e="xauta          header className="m-1 fll rounded-xl border border-slate-800 b-gslate-900 ia-slate-50 o-bl- osoule-/>
          < className="extm text-le-300">
             sae              <p e="text uearespa
          div
                       className="te-xl o-sebl text-white det-5usoeramp; ounenon</>
            < className="t- text-slate-300 md:-">
              Cutmer astr a wth moen Lucid viual befor s sr ve bookgs            <p
                     e="                aads.t
                              estat.label}
                className="rounded-2xl border border-lte-800 g-sate-900/0 p-4 text-ceter"
              >
                < className="tex upercetra-2em text-slate-00">{staae}
                p className="text-l fo-ble-"
              />
                      d
        </ae>
        <div             
            di
            cassName="e- exrderorsaesessa"
          >
            <section className="space-y-4">
              <div className="flex items-center gap-3>
              <div lassName="runded-xl bg-rple-500/10 -3 txt-rl-300">    <PclassName="h-6w-6"/>                </div>
                <div>
                  <h2 className="text-xl font-semibold text-white">Comers</h2>
     <pclassName="text-smtext-slate-00">en and priary comnta.</p>                </i>
              </div>

              <div className="grd ap-4 md:grd-cls-">
                <lae className="space-y- text-sm">
                  <pan cssName="flex itemscenter gap-2 text-slate-">
                    <e className="h- w- text-rl-300" />
                    ae
                  </span>
                  <ut
                    typ="tet"
                    nae="name"
                    ale=utomernonae}
                    onChange={handleCoChange}
                    placeholder="e oe me"
                    className=w-full rounded-2xl border bg-slate-90/0 x-4 py-3 text-white placeholder-slate-500 focs:border-urpl-50focus:outline-none 
                        
                      />
                    <aclassName="text- text-e400">name
                <
                l cassName="space-y-2 text-sm">
                  <span me="flex ite-center ga-2 text-slate-300">
                    <Mil lassName="h-4 w-4 text-purpl300" />
                    Email
                  </span>
                  <input
                    tpe="email"
                    name="email"
                    value={customerInfo.email}
                    onChange={handleCustomerChange}
                    placeholder="Enter customer email"
                    className={`w-full roundedxl border bg-slate-950/60 px-4 py-3tet-white placeholder-slate-500 focus:border-purple-500 focus:outline-none ${
                      errors.email ? 'border-red-500' : 'border-slae800'
                    }`}
                  />
                  {errors.email && <pan classNae="text-xs text-red-400"{errors.email}/>}
                </label>
              </div>
            </section>

            <setion cmspace-y-4">
              <div classNae=" -center justify-between">
                <div className="flex items-cente gap-3">
                  <div className="ruded-2xlbg-blue-500/10 p-3 ext-blue-300">
                    <MapPin className="-6 w-6" />
                  </div>
                  <div>
                    <h2 classNam="text-xlfon-semibold te-whit">Addresses</h2>
                    <p className="ext-sm text-slate-400">Every ustomer needs one primary location</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addAddress}
                  className="flex items-center gap-2 rounded-2xl border border-blue-500/40 px-4 py-2 text-sm font-semibold text-blue-200 transition hover:bg-blue-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Address
                </button>
              </div>

              <div className="space-y-4">
                {addresses.map((address, index) => (
                  <div
                    key={`address-${index}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/60 p-5 shadow-inner shadow-black/40"
                  >
                    <div className="mb-4 flex items-center justify-between text-sm text-slate-400">
                      <span className="flex items-center gap-2 font-semibold text-white">
                        <Compass className="h-5 w-5 text-blue-300" />
                        Address #{index + 1}
                      </span>
                      {addresses.length > 1 && (
                        <button
                          type="button"
                          onClick={() => removeAddress(index)}
                          className="flex items-center gap-1 text-xs text-red-400 transition hover:text-red-200"
                        >
                          <Trash2 className="h-4 w-4" />
                          Remove
                        </button>
                      )}
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="text-sm text-slate-300">
                        Address Line
                        <input
                          type="text"
                          value={address.addressLine}
                          onChange={(e) => handleAddressChange(index, 'addressLine', etargetvalue)}
                          placeholder="Street, building, etc."
                          className="mt-1 w-full rounded-200/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-00 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-30">
                        City
                        <input
                          type="text"
                          value={address.city}
                          onChange={(e) => handleAddressChange(index, 'city', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-90070 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        State
                        <input
                          type="text"
                          value={address.state}
                          onChange={(e) => handleAddressChange(index, 'state', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300">
                        Postal Code
                        <input
                          type="text"
                          value={address.postalCode}
                          onChange={(e) => handleAddressChange(index, 'postalCode', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                      <label className="text-sm text-slate-300 md:col-span-2">
                        Country
                        <input
                          type="text"
                          value={address.country}
                          onChange={(e) => handleAddressChange(index, 'country', e.target.value)}
                          className="mt-1 w-full rounded-2xl border border-slate-800 bg-slate-900/70 px-4 py-3 text-white placeholder-slate-500 focus:border-blue-500 focus:outline-none"
                        />
                      </label>
                    </div>

                    <label className="mt-4 flex cursor-pointer items-center gap-2 text-sm text-slate-300">
                      <input
                        type="radio"
                        checked={address.isPrimary}
                        onChange={() => setPrimaryAddress(index)}
                        name="primary-address"
                        className="h-4 w-4 text-blue-500 focus:ring-blue-500"
                      />
                      Primary Address
                    </label>
                  </div>
                ))}
              </div>
              {errors.addresses && <span className="text-xs text-red-400">{errors.addresses}</span>}
            </section>

            <section className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-emerald-500/10 p-3 text-emerald-300">
                    <Phone className="h-6 w-6" />
                  </div>
                  <div>
                    <h2 className="text-xl font-semibold text-white">Contact Numbers</h2>
                    <p className="text-sm text-slate-400">Label every channel and pick one primary.</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={addContact}
                  className="flex items-center gap-2 rounded-2xl border border-emerald-500/40 px-4 py-2 text-sm font-semibold text-emerald-200 transition hover:bg-emerald-500/10"
                >
                  <Plus className="h-4 w-4" />
                  Add Contact
                </button>
              </div>

              <div className="space-y-4">
                {contacts.map((contact, index) => (
                  <div
                    key={`contact-${index}`}
                    className="rounded-3xl border border-slate-800 bg-slate-950/)))
