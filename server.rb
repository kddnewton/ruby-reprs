# frozen_string_literal: true

require "json"
require "sinatra"

require "parser/current"
require "ruby_parser"
require "syntax_tree"
require "yarp"

def parse(code, types)
  types.to_h do |type|
    parsed =
      case type
      in "RSR" then Ripper.sexp_raw(code)
      in "RS"  then Ripper.sexp(code)
      in "RVA" then RubyVM::AbstractSyntaxTree.parse(code)
      in "P"   then Parser::CurrentRuby.parse(code)
      in "RP"  then RubyParser.new.parse(code)
      in "ST"  then SyntaxTree.parse(code)
      in "Y"   then YARP.parse(code).value
      end

    [type, PP.pp(parsed, +"", 79)]
  end
end

before do
  response.headers["Access-Control-Allow-Origin"] = "*"
end

post "/" do
  request.body.rewind

  case JSON.parse(request.body.read, symbolize_names: true)
  in { code:, types: }
    JSON.dump(parse(code, types & %w[RSR RS RVA P RP ST Y]))
  else
    status 400
  end
end
