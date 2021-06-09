using System;
using System.Net.Http;
using System.Security.Cryptography.X509Certificates;
using System.Text;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Logging;
using Newtonsoft.Json;

namespace ApplePayDemo.Controllers
{
    public class HomeController : Controller
    {
        private readonly ILogger<HomeController> _logger;

        public HomeController(ILogger<HomeController> logger)
        {
            _logger = logger;
        }

        [HttpGet("/")]
        public IActionResult Index()
        {
            return View();
        }

        [HttpPost("/validate-merchant")]
        public async Task<IActionResult> ValidateMerchant([FromBody] FrontEndValidationRequest request)
        {
            // .Net requires a PKCS12 certificate file which combines both key and cert
            // To combine your certs, use the following (Requires OpenSSL supported):
            // openssl pkcs12 -export -in merchant_id.pem -inkey merchant_id.key -out cert.pfx
            var certFile = await System.IO.File.ReadAllBytesAsync("merchant_id/cert.pfx");
            var cert = new X509Certificate2(certFile, "123");

            var opt = new HttpClientHandler();
            opt.ClientCertificates.Add(cert);
            var client = new HttpClient(opt);
            
            var requestBody = new ValidateMerchantRequest
            {
                merchantIdentifier = "merchant.com.example",
                displayName = "Coffee Store",
                initiative = "web",
                initiativeContext = "example.com"
            };
            
            using (var content = new StringContent(JsonConvert.SerializeObject(requestBody), Encoding.Default, "application/json"))
            using (var response = await client.PostAsync(request.ValidationUrl, content))
            {
                try
                {
                    response.EnsureSuccessStatusCode();
                }
                catch
                {
                    // TODO: Set Content-Type: application.json
                    return BadRequest(await response.Content.ReadAsStringAsync());
                }
                
                return Content(await response.Content.ReadAsStringAsync(), "application/json");
            }
        }
    }
    
    class ValidateMerchantRequest
    {
        public string merchantIdentifier { get; set; }
        public string displayName { get; set; }
        public string initiative { get; set; }
        public string initiativeContext { get; set; }
    }

    public class FrontEndValidationRequest
    {
        public string ValidationUrl { get; set; }
    }
}
