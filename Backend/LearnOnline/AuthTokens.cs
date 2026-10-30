using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Text;
using Microsoft.IdentityModel.Tokens;
using LearnOnline.Models;

namespace LearnOnline
{
    // Issues the signed token the frontend sends as "Authorization: Bearer <token>" on every request.
    // The token carries the user's id and role, so controllers can check who is calling.
    public static class AuthTokens
    {
        public static readonly TimeSpan Lifetime = TimeSpan.FromHours(12);

        public static SymmetricSecurityKey SigningKey(string secret) => new(Encoding.UTF8.GetBytes(secret));

        public static string Create(User user, string secret)
        {
            var claims = new[]
            {
                new Claim(ClaimTypes.NameIdentifier, user.Id),
                new Claim(ClaimTypes.Email, user.Email),
                new Claim(ClaimTypes.Role, user.Role.ToString()),
            };
            var token = new JwtSecurityToken(
                claims: claims,
                expires: DateTime.UtcNow.Add(Lifetime),
                signingCredentials: new SigningCredentials(SigningKey(secret), SecurityAlgorithms.HmacSha256));
            return new JwtSecurityTokenHandler().WriteToken(token);
        }
    }
}
