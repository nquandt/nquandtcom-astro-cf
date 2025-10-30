public static class ClientSideRedirectExtensions
{
    public static async Task ResponseWithClientSideRedirectAsync(this HttpContext context, string location)
    {
        // context.PreventCaching(); // Recommend preventing caching for this. 
        context.Response.ContentType = "text/html";
        context.Response.StatusCode = 200;                

        await context.Response.WriteAsync($"<html><head><meta http-equiv=\"refresh\" content=\"0; URL='{location}'\"/></head></html>", System.Text.Encoding.UTF8, context.RequestAborted);
    }
}
