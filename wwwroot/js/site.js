window.applePaySession = null;
let applePayButton = document.querySelector('.apple-pay-button');

if (! (window.ApplePaySession && window.ApplePaySession.canMakePayments())) {
    applePayButton.remove();
    
    let h4 = document.createElement('h4');
    h4.innerText = 'Apple Pay is not supported, please use Safari on a supported macOS version.';
    document.body.appendChild(h4);
}

if (applePayButton) {
    applePayButton.addEventListener('click', initApplePay);
}

function initApplePay() {
    let request = {
        countryCode: 'SA',
        currencyCode: 'SAR',
        supportedNetworks: ['visa', 'masterCard', 'amex', 'mada'],
        merchantCapabilities: ['supports3DS'],
        total: {
            label: 'Coffee Store',
            amount: '1.00'
        }
    };

    window.applePaySession = new ApplePaySession(6, request);
    window.applePaySession.onvalidatemerchant = onMerchantValidation;
    window.applePaySession.onpaymentauthorized = onPaymentAuthorized;
    window.applePaySession.oncancel = onApplePayCanceled;
    
    window.applePaySession.begin();
}

function onMerchantValidation(event) {
    fetch('/validate-merchant', {
        method: 'post',
        credentials: 'same-origin',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'validationUrl': event.validationURL
        })
    })
        .then(res => res.json())
        .then(res => {
            console.log(res);
            window.applePaySession.completeMerchantValidation(res)
        })
        .catch(error => console.log(`Could not validate merchant ${error}`));
}

function onPaymentAuthorized(event) {
    const paymentData = event.payment.token.paymentData;
    
    // Complete Payment with Moyasar
    fetch('https://api.moyasar.com/v1/payments', {
        method: 'post',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            'publishable_api_key': 'put_your_api_key_here',
            'amount': '100',
            'currency': 'SAR',
            'description': 'Apple Pay Payment Demo in ASP.NET Core',
            'source': {
                'type': 'applepay',
                'token': JSON.stringify(paymentData)
            }
        })
    })
        .then(res => res.ok ? onMoyasarResponse(res) : onMoyasarError(res))
        .catch(error => console.log(`Could not create payment at Moyasar: ${error}`));
}

function onMoyasarResponse(res) {
    res.json()
        .then(payment => {
            if (payment.status === 'paid') {
                window.applePaySession.completePayment({
                    'status': ApplePaySession.STATUS_SUCCESS
                });
            } else {
                window.applePaySession.completePayment({
                    'status': ApplePaySession.STATUS_FAILURE,
                    'errors': [
                        payment.source.message
                    ]
                });
            }
        })
        .catch(error => console.log(error));
}

function onMoyasarError(res) {
    res.json()
        .then(payment => {
            console.log(payment.message);
        })
        .catch(error => console.log(error));
}

function onApplePayCanceled(event) {
    console.log('Apple Pay was canceled');
    console.log(event);
    window.applePaySession = null;
}
